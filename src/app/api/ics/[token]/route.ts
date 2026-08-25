import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantName } from "@/lib/data/restaurants";
import {
  DEMO_BOOKING_COOKIE,
  getDemoBookingByToken,
  isDemoMode,
} from "@/lib/demo/data";
import { routing } from "@/i18n/routing";
import type { BookingByToken } from "@/lib/supabase/database.types";
import { BRAND } from "@/config/brand";

const icsDate = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeText = (v: string) =>
  v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// "Add to calendar" — the token is the guest's secret, same as the manage
// page. ?l=<locale> keeps the manage link and naming in the guest's language.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const requestedLocale = request.nextUrl.searchParams.get("l") ?? "en";
  const locale = (routing.locales as readonly string[]).includes(requestedLocale)
    ? requestedLocale
    : "en";

  let booking: BookingByToken | null = null;
  if (isDemoMode()) {
    const cookieStore = await cookies();
    booking = getDemoBookingByToken(
      token,
      cookieStore.get(DEMO_BOOKING_COOKIE)?.value,
    );
  } else if (/^[0-9a-f-]{36}$/i.test(token)) {
    const sb = await createClient();
    const { data } = await sb.rpc("get_booking_by_token", { p_token: token });
    booking = data?.[0] ?? null;
  }
  if (!booking) return new NextResponse("Not found", { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const name =
    (await getRestaurantName(booking.restaurant_id, locale)) ??
    booking.restaurant_slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const cancelled =
    booking.status === "cancelled" || booking.status === "no_show";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND.name}//Booking//EN`,
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@${BRAND.domain}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(booking.starts_at)}`,
    `DTEND:${icsDate(booking.ends_at)}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${escapeText(`${name} — ${booking.confirmation_code}`)}`,
    booking.restaurant_address
      ? `LOCATION:${escapeText(booking.restaurant_address)}`
      : `GEO:${booking.restaurant_lat};${booking.restaurant_lng}`,
    `DESCRIPTION:${escapeText(`${siteUrl}/${locale}/booking/${token}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking-${booking.confirmation_code}.ics"`,
    },
  });
}
