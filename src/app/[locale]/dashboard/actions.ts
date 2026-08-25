"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeRestaurantCookie } from "@/lib/dashboard/context";
import { mapBookingError } from "@/lib/booking/errors";
import {
  sendGuestCancellation,
  sendGuestConfirmation,
  type BookingEmailData,
} from "@/lib/email/send";
import type { BookingStatus, MemberRole } from "@/lib/supabase/database.types";

type ActionResult = { ok: true } | { ok: false; error?: string };

const ROLE_RANK: Record<MemberRole, number> = { staff: 0, manager: 1, owner: 2 };

// RLS treats all members alike — roles are enforced here, at the top of
// every action (and mirrored in the UI).
async function requireRole(restaurantId: string, min: MemberRole) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const [{ data: member }, { data: admin }] = await Promise.all([
    sb
      .from("restaurant_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    sb.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (admin) return { sb, userId: user.id, role: "owner" as MemberRole };
  if (!member || ROLE_RANK[member.role] < ROLE_RANK[min])
    throw new Error("not_allowed");
  return { sb, userId: user.id, role: member.role };
}

export async function selectRestaurant(restaurantId: string): Promise<ActionResult> {
  try {
    await requireRole(restaurantId, "staff");
    const cookieStore = await cookies();
    cookieStore.set(activeRestaurantCookie, restaurantId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function signOut(): Promise<ActionResult> {
  const sb = await createClient();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true };
}

async function bookingEmailData(
  sb: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
): Promise<BookingEmailData | null> {
  const { data: b } = await sb
    .from("bookings")
    .select(
      `guest_name, guest_email, guest_locale, party_size, starts_at, status,
       confirmation_code, manage_token,
       restaurants(timezone, address_line, email, restaurant_translations(locale, name))`,
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;
  const r = b.restaurants as unknown as {
    timezone: string;
    address_line: string | null;
    email: string | null;
    restaurant_translations: { locale: string; name: string }[];
  };
  return {
    guestName: b.guest_name,
    guestEmail: b.guest_email,
    guestLocale: b.guest_locale,
    partySize: b.party_size,
    startsAt: b.starts_at,
    confirmationCode: b.confirmation_code,
    manageToken: b.manage_token,
    status: b.status,
    restaurantName:
      r.restaurant_translations.find((t) => t.locale === b.guest_locale)?.name ??
      r.restaurant_translations[0]?.name ??
      "",
    restaurantEmail: r.email,
    restaurantTimezone: r.timezone,
    restaurantAddress: r.address_line,
  };
}

const statusSchema = z.object({
  restaurantId: z.string().uuid(),
  bookingId: z.string().uuid(),
  status: z.enum(["confirmed", "seated", "completed", "cancelled", "no_show"]),
});

export async function updateBookingStatus(
  raw: z.infer<typeof statusSchema>,
): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const { restaurantId, bookingId, status } = parsed.data;
  try {
    const { sb } = await requireRole(restaurantId, "staff");
    const patch: {
      status: BookingStatus;
      cancelled_at?: string;
      cancelled_by?: string;
    } = { status };
    if (status === "cancelled") {
      patch.cancelled_at = new Date().toISOString();
      patch.cancelled_by = "restaurant";
    }
    const wasPending =
      status === "confirmed"
        ? (
            await sb
              .from("bookings")
              .select("status")
              .eq("id", bookingId)
              .maybeSingle()
          ).data?.status === "pending"
        : false;

    const { data: updated, error } = await sb
      .from("bookings")
      .update(patch)
      .eq("id", bookingId)
      .eq("restaurant_id", restaurantId)
      .select("id");
    if (error) return { ok: false, error: error.message };
    // Zero rows = the booking doesn't belong to this restaurant (or vanished)
    // — report failure instead of pretending and emailing the guest.
    if (!updated?.length) return { ok: false, error: "not_found" };

    // Guest emails: cancellation always; confirmation when a request flips.
    const data = await bookingEmailData(sb, bookingId);
    if (data) {
      after(async () => {
        if (status === "cancelled") await sendGuestCancellation(data);
        if (status === "confirmed" && wasPending)
          await sendGuestConfirmation(data);
      });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const walkInSchema = z.object({
  restaurantId: z.string().uuid(),
  party: z.number().int().min(1).max(40),
  name: z.string().trim().max(120).optional(),
});

export async function createWalkIn(
  raw: z.infer<typeof walkInSchema>,
): Promise<ActionResult> {
  const parsed = walkInSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  try {
    const { sb } = await requireRole(parsed.data.restaurantId, "staff");
    // Now, rounded down to the quarter hour — bypass_rules allows off-grid.
    const now = new Date();
    now.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);
    const { error } = await sb.rpc("create_booking", {
      p_restaurant_id: parsed.data.restaurantId,
      p_starts_at: now.toISOString(),
      p_party_size: parsed.data.party,
      p_guest_name: parsed.data.name || "Walk-in",
      p_source: "walk_in",
      p_bypass_rules: true,
    });
    if (error) return { ok: false, error: mapBookingError(error.message) };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const rulesSchema = z.object({
  restaurantId: z.string().uuid(),
  min_party: z.number().int().min(1).max(40),
  max_party: z.number().int().min(1).max(40),
  lead_time_minutes: z.number().int().min(0).max(10080),
  max_advance_days: z.number().int().min(1).max(365),
  turn_minutes: z.number().int().min(15).max(600),
  slot_interval_minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
});

export async function saveBookingRules(
  raw: z.infer<typeof rulesSchema>,
): Promise<ActionResult> {
  const parsed = rulesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const { restaurantId, ...fields } = parsed.data;
  try {
    const { sb } = await requireRole(restaurantId, "manager");
    const { error } = await sb
      .from("restaurants")
      .update(fields)
      .eq("id", restaurantId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const periodSchema = z.object({
  restaurantId: z.string().uuid(),
  id: z.string().uuid().optional(),
  nameEn: z.string().trim().min(1).max(60),
  nameEl: z.string().trim().min(1).max(60),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  first_seating: z.string().regex(/^\d{2}:\d{2}$/),
  last_seating: z.string().regex(/^\d{2}:\d{2}$/),
  turn_minutes: z.number().int().min(15).max(600).nullable(),
  slot_interval_minutes: z
    .union([z.literal(15), z.literal(30), z.literal(60)])
    .nullable(),
  max_covers_per_slot: z.number().int().min(1).max(500).nullable(),
  is_active: z.boolean(),
});

export async function upsertServicePeriod(
  raw: z.infer<typeof periodSchema>,
): Promise<ActionResult> {
  const parsed = periodSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;
  try {
    const { sb } = await requireRole(d.restaurantId, "manager");
    const row = {
      restaurant_id: d.restaurantId,
      name: { en: d.nameEn, el: d.nameEl },
      weekdays: d.weekdays,
      first_seating: d.first_seating,
      last_seating: d.last_seating,
      turn_minutes: d.turn_minutes,
      slot_interval_minutes: d.slot_interval_minutes,
      max_covers_per_slot: d.max_covers_per_slot,
      is_active: d.is_active,
    };
    const { error } = d.id
      ? await sb
          .from("service_periods")
          .update(row)
          .eq("id", d.id)
          .eq("restaurant_id", d.restaurantId)
      : await sb.from("service_periods").insert(row);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteServicePeriod(
  restaurantId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const { sb } = await requireRole(restaurantId, "manager");
    const { error } = await sb
      .from("service_periods")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const tableSchema = z.object({
  restaurantId: z.string().uuid(),
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(20),
  min_party: z.number().int().min(1).max(40),
  max_party: z.number().int().min(1).max(40),
  is_online_bookable: z.boolean(),
  is_active: z.boolean(),
});

export async function upsertTable(
  raw: z.infer<typeof tableSchema>,
): Promise<ActionResult> {
  const parsed = tableSchema.safeParse(raw);
  if (!parsed.success || parsed.data.max_party < parsed.data.min_party)
    return { ok: false };
  const d = parsed.data;
  try {
    const { sb } = await requireRole(d.restaurantId, "manager");
    const row = {
      restaurant_id: d.restaurantId,
      label: d.label,
      min_party: d.min_party,
      max_party: d.max_party,
      is_online_bookable: d.is_online_bookable,
      is_active: d.is_active,
    };
    const { error } = d.id
      ? await sb
          .from("dining_tables")
          .update(row)
          .eq("id", d.id)
          .eq("restaurant_id", d.restaurantId)
      : await sb.from("dining_tables").insert(row);
    if (error) return { ok: false, error: error.message };
    // Adding real tables usually follows the placeholder warning — clear it.
    if (!d.id) {
      await sb
        .from("restaurants")
        .update({ tables_are_placeholder: false })
        .eq("id", d.restaurantId);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function confirmRealTables(restaurantId: string): Promise<ActionResult> {
  try {
    const { sb } = await requireRole(restaurantId, "manager");
    const { error } = await sb
      .from("restaurants")
      .update({ tables_are_placeholder: false })
      .eq("id", restaurantId);
    if (error) return { ok: false };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const closureSchema = z.object({
  restaurantId: z.string().uuid(),
  starts_at: z.string().min(10),
  ends_at: z.string().min(10),
  reason: z.string().trim().max(200).optional(),
});

export async function addClosure(
  raw: z.infer<typeof closureSchema>,
): Promise<ActionResult> {
  const parsed = closureSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;
  if (new Date(d.ends_at) <= new Date(d.starts_at)) return { ok: false };
  try {
    const { sb } = await requireRole(d.restaurantId, "manager");
    const { error } = await sb.from("closures").insert({
      restaurant_id: d.restaurantId,
      starts_at: d.starts_at,
      ends_at: d.ends_at,
      reason: d.reason || null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteClosure(
  restaurantId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const { sb } = await requireRole(restaurantId, "manager");
    const { error } = await sb
      .from("closures")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { ok: false };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const profileSchema = z.object({
  restaurantId: z.string().uuid(),
  translations: z.array(
    z.object({
      locale: z.string().max(5),
      name: z.string().trim().min(1).max(120),
      tagline: z.string().trim().max(200).optional(),
      description: z.string().trim().max(3000).optional(),
    }),
  ),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  website: z.string().trim().url().max(300).optional().or(z.literal("")),
  instagram: z.string().trim().max(300).optional(),
  menu_url: z.string().trim().url().max(300).optional().or(z.literal("")),
});

export async function saveProfile(
  raw: z.infer<typeof profileSchema>,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;
  try {
    const { sb } = await requireRole(d.restaurantId, "manager");
    const { error } = await sb
      .from("restaurants")
      .update({
        phone: d.phone || null,
        whatsapp: d.whatsapp || null,
        email: d.email || null,
        website: d.website || null,
        instagram: d.instagram || null,
        menu_url: d.menu_url || null,
      })
      .eq("id", d.restaurantId);
    if (error) return { ok: false, error: error.message };
    for (const t of d.translations) {
      // Saving a translation from the dashboard clears the review flag.
      const { error: terr } = await sb.from("restaurant_translations").upsert({
        restaurant_id: d.restaurantId,
        locale: t.locale,
        name: t.name,
        tagline: t.tagline || null,
        description: t.description || null,
        is_machine_translated: false,
      });
      if (terr) return { ok: false, error: terr.message };
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const inviteSchema = z.object({
  restaurantId: z.string().uuid(),
  email: z.string().trim().email(),
  role: z.enum(["owner", "manager", "staff"]),
});

export async function inviteMember(
  raw: z.infer<typeof inviteSchema>,
): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;
  try {
    await requireRole(d.restaurantId, "owner");
    const admin = createAdminClient();
    // Find-or-invite the auth user, then add membership.
    const { data: invited, error: invErr } =
      await admin.auth.admin.inviteUserByEmail(d.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/en/dashboard`,
      });
    let userId = invited?.user?.id;
    if (invErr) {
      // Already registered — look them up, paging past the 50-user default.
      const needle = d.email.toLowerCase();
      for (let page = 1; page <= 20 && !userId; page++) {
        const { data: list, error: listErr } =
          await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr || !list?.users.length) break;
        userId = list.users.find((u) => u.email?.toLowerCase() === needle)?.id;
        if (list.users.length < 1000) break;
      }
    }
    if (!userId) return { ok: false, error: "invite_failed" };
    const { error } = await admin.from("restaurant_members").upsert({
      user_id: userId,
      restaurant_id: d.restaurantId,
      role: d.role,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function removeMember(
  restaurantId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    const { userId: selfId } = await requireRole(restaurantId, "owner");
    if (userId === selfId) return { ok: false, error: "cannot_remove_self" };
    const admin = createAdminClient();
    const { error } = await admin
      .from("restaurant_members")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("user_id", userId);
    if (error) return { ok: false };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
