"use server";

import { after } from "next/server";
import { cookies } from "next/headers";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryByCode } from "@/lib/data/config";
import { getAvailability, findNextAvailableDay } from "./availability";
import { mapBookingError, type BookingErrorCode } from "./errors";
import { bookingInputSchema, type BookingInput } from "./schema";
import {
  sendGuestConfirmation,
  sendRestaurantNotification,
  sendGuestCancellation,
  sendRestaurantCancellation,
  type BookingEmailData,
} from "@/lib/email/send";
import type { AvailabilitySlot } from "@/lib/supabase/database.types";
import {
  cancelDemoBooking,
  createDemoBooking,
  demoAvailability,
  demoRestaurants,
  isDemoMode,
  DEMO_BOOKING_COOKIE,
} from "@/lib/demo/data";

const demoBySlugOrId = (idOrSlug: string) =>
  demoRestaurants.find((r) => r.id === idOrSlug || r.slug === idOrSlug);

export type AvailabilityResult =
  | { ok: true; slots: AvailabilitySlot[]; nextAvailableDay: string | null }
  | { ok: false };

export async function fetchAvailability(
  restaurantId: string,
  date: string,
  party: number,
): Promise<AvailabilityResult> {
  if (isDemoMode()) {
    const slots = demoAvailability(restaurantId, date, party);
    let nextAvailableDay: string | null = null;
    if (!slots.some((s) => s.available)) {
      for (let i = 1; i <= 7 && !nextAvailableDay; i++) {
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + i);
        const iso = d.toISOString().slice(0, 10);
        if (demoAvailability(restaurantId, iso, party).some((s) => s.available))
          nextAvailableDay = iso;
      }
    }
    return { ok: true, slots, nextAvailableDay };
  }
  try {
    const slots = await getAvailability(restaurantId, date, party);
    const nextAvailableDay = slots.some((s) => s.available)
      ? null
      : await findNextAvailableDay(restaurantId, date, party);
    return { ok: true, slots, nextAvailableDay };
  } catch {
    return { ok: false };
  }
}

export type CreateBookingResult =
  | {
      ok: true;
      manageToken: string;
      confirmationCode: string;
      status: string;
    }
  | { ok: false; code: BookingErrorCode };

async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured (dev) — skip
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      },
    );
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

export async function createBooking(
  raw: BookingInput,
): Promise<CreateBookingResult> {
  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) {
    // Browsers accept emails like "a@a" that our schema rejects — name the
    // actual problem instead of a generic failure.
    const fields = parsed.error.flatten().fieldErrors;
    if (fields.email) return { ok: false, code: "invalid_email" };
    if (fields.name) return { ok: false, code: "guest_name_required" };
    return { ok: false, code: "generic" };
  }
  const input = parsed.data;

  // Honeypot: log only, never block. Browser autofill and password managers
  // provably stuff hidden fields for real guests; blocking on it produced
  // "Something went wrong" for humans. Real bot defense = Turnstile keys.
  if (input.website) {
    console.warn("[booking] honeypot field was filled (autofill or bot) — proceeding");
  }
  if (!(await verifyTurnstile(input.turnstileToken))) {
    return { ok: false, code: "generic" };
  }

  // Demo mode: simulate the booking so the flow can be tried before Supabase
  // exists. Real bookings ONLY ever go through the create_booking RPC.
  if (isDemoMode()) {
    const demo = demoBySlugOrId(input.restaurantId);
    if (!demo) return { ok: false, code: "restaurant_not_bookable" };
    const startsAtDemo = fromZonedTime(
      `${input.date}T${input.time}:00`,
      demo.timezone,
    ).toISOString();
    const created = createDemoBooking({
      restaurantId: demo.id,
      startsAt: startsAtDemo,
      party: input.party,
      name: input.name,
      requests: input.requests || undefined,
      locale: input.locale,
    });
    if (!created) return { ok: false, code: "generic" };
    // Cookie is the durable demo store — serverless instances don't share
    // the in-memory map, and the confirmation page is a separate request.
    const cookieStore = await cookies();
    cookieStore.set(DEMO_BOOKING_COOKIE, JSON.stringify(created.record), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
    });
    return {
      ok: true,
      manageToken: created.manageToken,
      confirmationCode: created.confirmationCode,
      status: created.status,
    };
  }

  const sb = await createClient();

  // Time zone comes from the DB, never from the client.
  const { data: restaurant } = await sb
    .from("restaurants")
    .select(
      "id, timezone, email, address_line, country_code, restaurant_translations(locale, name)",
    )
    .eq("id", input.restaurantId)
    .maybeSingle();
  if (!restaurant) return { ok: false, code: "restaurant_not_bookable" };

  const startsAt = fromZonedTime(
    `${input.date}T${input.time}:00`,
    restaurant.timezone,
  ).toISOString();

  const { data, error } = await sb.rpc("create_booking", {
    p_restaurant_id: input.restaurantId,
    p_starts_at: startsAt,
    p_party_size: input.party,
    p_guest_name: input.name,
    p_guest_email: input.email || null,
    p_guest_phone: input.phone || null,
    p_locale: input.locale,
    p_special_requests: input.requests || null,
  });

  if (error) return { ok: false, code: mapBookingError(error.message) };
  const booking = data?.[0];
  if (!booking) return { ok: false, code: "generic" };

  const translations = restaurant.restaurant_translations as {
    locale: string;
    name: string;
  }[];
  const restaurantName =
    translations.find((t) => t.locale === input.locale)?.name ??
    translations[0]?.name ??
    "";

  const emailData: BookingEmailData = {
    guestName: input.name,
    guestEmail: input.email || null,
    guestLocale: input.locale,
    partySize: booking.party_size,
    startsAt: booking.starts_at,
    confirmationCode: booking.confirmation_code,
    manageToken: booking.manage_token,
    status: booking.status,
    restaurantName,
    restaurantEmail: restaurant.email,
    restaurantTimezone: restaurant.timezone,
    restaurantAddress: restaurant.address_line,
    staffLocale: getCountryByCode(restaurant.country_code)?.staff_locale,
  };
  // after(): runs once the response is sent, but keeps the serverless
  // instance alive until the sends finish. The booking is already committed
  // and deliver() never throws.
  after(async () => {
    await sendGuestConfirmation(emailData);
    await sendRestaurantNotification(emailData);
  });

  return {
    ok: true,
    manageToken: booking.manage_token,
    confirmationCode: booking.confirmation_code,
    status: booking.status,
  };
}

export type CancelResult = { ok: true } | { ok: false; code: BookingErrorCode };

export async function cancelBookingByToken(token: string): Promise<CancelResult> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false, code: "generic" };
  if (isDemoMode()) {
    const cookieStore = await cookies();
    const cancelled = cancelDemoBooking(
      token,
      cookieStore.get(DEMO_BOOKING_COOKIE)?.value,
    );
    if (!cancelled) return { ok: false, code: "cannot_cancel" };
    cookieStore.set(
      DEMO_BOOKING_COOKIE,
      JSON.stringify({ ...cancelled, manage_token: token }),
      { path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" },
    );
    return { ok: true };
  }
  const sb = await createClient();

  // Read first (for the emails) — the RPC is the one that validates state.
  const { data: rows } = await sb.rpc("get_booking_by_token", { p_token: token });
  const booking = rows?.[0];

  const { error } = await sb.rpc("cancel_booking_by_token", { p_token: token });
  if (error) return { ok: false, code: mapBookingError(error.message) };

  if (booking) {
    const { data: restaurant } = await sb
      .from("restaurants")
      .select(
        "email, timezone, address_line, country_code, restaurant_translations(locale, name)",
      )
      .eq("id", booking.restaurant_id)
      .maybeSingle();
    const translations = (restaurant?.restaurant_translations ?? []) as {
      locale: string;
      name: string;
    }[];
    // The token RPC doesn't expose contact details; the server-only admin
    // client fetches them so both sides get the cancellation email.
    let guestEmail: string | null = null;
    let guestLocale = "en";
    try {
      const admin = createAdminClient();
      const { data: full } = await admin
        .from("bookings")
        .select("guest_email, guest_locale")
        .eq("manage_token", token)
        .maybeSingle();
      guestEmail = full?.guest_email ?? null;
      guestLocale = full?.guest_locale ?? "en";
    } catch {
      // placeholder/missing service key — guest still sees the on-page confirmation
    }

    const emailData: BookingEmailData = {
      guestName: booking.guest_name,
      guestEmail,
      guestLocale,
      partySize: booking.party_size,
      startsAt: booking.starts_at,
      confirmationCode: booking.confirmation_code,
      manageToken: token,
      status: "cancelled",
      restaurantName: translations[0]?.name ?? "",
      restaurantEmail: restaurant?.email ?? null,
      restaurantTimezone: restaurant?.timezone ?? "Asia/Nicosia",
      restaurantAddress: restaurant?.address_line ?? null,
      staffLocale: restaurant
        ? getCountryByCode(restaurant.country_code)?.staff_locale
        : undefined,
    };
    after(async () => {
      await sendGuestCancellation(emailData);
      await sendRestaurantCancellation(emailData);
    });
  }

  return { ok: true };
}
