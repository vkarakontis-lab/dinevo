import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGuestReminder, type BookingEmailData } from "@/lib/email/send";

// Vercel Cron hits this hourly. Confirmed bookings starting 20–28h from now
// that haven't been reminded get one reminder in the guest's locale.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const from = new Date(now + 20 * 3600_000).toISOString();
  const to = new Date(now + 28 * 3600_000).toISOString();

  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      `id, starts_at, party_size, guest_name, guest_email, guest_locale,
       confirmation_code, manage_token,
       restaurants(timezone, address_line, email, restaurant_translations(locale, name))`,
    )
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("starts_at", from)
    .lte("starts_at", to);

  if (error) {
    console.error("[cron/reminders] query failed:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let sent = 0;
  for (const b of bookings ?? []) {
    const r = b.restaurants as unknown as {
      timezone: string;
      address_line: string | null;
      email: string | null;
      restaurant_translations: { locale: string; name: string }[];
    } | null;
    if (!r || !b.guest_email) {
      // Nothing to send — still mark it so we don't rescan forever.
      await admin
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", b.id);
      continue;
    }
    const name =
      r.restaurant_translations.find((t) => t.locale === b.guest_locale)?.name ??
      r.restaurant_translations[0]?.name ??
      "";
    const data: BookingEmailData = {
      guestName: b.guest_name,
      guestEmail: b.guest_email,
      guestLocale: b.guest_locale,
      partySize: b.party_size,
      startsAt: b.starts_at,
      confirmationCode: b.confirmation_code,
      manageToken: b.manage_token,
      status: "confirmed",
      restaurantName: name,
      restaurantEmail: r.email,
      restaurantTimezone: r.timezone,
      restaurantAddress: r.address_line,
    };
    await sendGuestReminder(data);
    await admin
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id);
    sent++;
  }

  return NextResponse.json({ ok: true, sent, scanned: bookings?.length ?? 0 });
}
