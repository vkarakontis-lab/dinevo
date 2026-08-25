import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/lib/supabase/database.types";

const ACTIVE_COOKIE = "kratisi_active_restaurant";

export type Membership = {
  restaurant_id: string;
  role: MemberRole;
  restaurant: { id: string; slug: string; timezone: string; name: string };
};

export type DashboardContext = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  memberships: Membership[];
  active: Membership | null;
};

// Server-side truth for who the user is and which restaurant they act on.
// The proxy only redirects; every page/action re-checks through this.
export async function getDashboardContext(): Promise<DashboardContext | null> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const [{ data: adminRow }, { data: memberRows }] = await Promise.all([
    sb.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    sb
      .from("restaurant_members")
      .select(
        "restaurant_id, role, restaurants(id, slug, timezone, restaurant_translations(locale, name))",
      )
      .eq("user_id", user.id),
  ]);

  const memberships: Membership[] = (memberRows ?? []).map((m) => {
    const r = m.restaurants as unknown as {
      id: string;
      slug: string;
      timezone: string;
      restaurant_translations: { locale: string; name: string }[];
    };
    return {
      restaurant_id: m.restaurant_id,
      role: m.role,
      restaurant: {
        id: r.id,
        slug: r.slug,
        timezone: r.timezone,
        name:
          r.restaurant_translations.find((t) => t.locale === "en")?.name ??
          r.restaurant_translations[0]?.name ??
          r.slug,
      },
    };
  });

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_COOKIE)?.value;
  const active =
    memberships.find((m) => m.restaurant_id === preferred) ??
    memberships[0] ??
    null;

  return {
    userId: user.id,
    email: user.email ?? null,
    isAdmin: !!adminRow,
    memberships,
    active,
  };
}

export const activeRestaurantCookie = ACTIVE_COOKIE;
