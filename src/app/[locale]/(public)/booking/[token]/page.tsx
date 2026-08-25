import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CalendarPlus, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantName } from "@/lib/data/restaurants";
import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { formatBookingDay, formatBookingTime } from "@/lib/dates";
import { cookies } from "next/headers";
import {
  DEMO_BOOKING_COOKIE,
  getDemoBookingByToken,
  isDemoMode,
} from "@/lib/demo/data";
import type { BookingByToken } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

// Guests hold a secret manage_token — no account, no row access.
export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isNew = (await searchParams).new === "1";

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
  if (!booking) notFound();

  const restaurantName =
    (await getRestaurantName(booking.restaurant_id, locale)) ??
    booking.restaurant_slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const day = formatBookingDay(booking.starts_at, booking.restaurant_timezone, locale);
  const time = formatBookingTime(booking.starts_at, booking.restaurant_timezone);
  const cancellable =
    (booking.status === "confirmed" || booking.status === "pending") &&
    new Date(booking.starts_at) > new Date();

  const cancelled =
    booking.status === "cancelled" || booking.status === "no_show";
  const confirmed =
    booking.status === "confirmed" || booking.status === "seated";

  return (
    <div className="mx-auto max-w-lg py-10">
      <h1 className="font-display text-3xl font-extrabold text-balance sm:text-4xl">
        {isNew
          ? booking.status === "pending"
            ? t("booking.pendingTitle")
            : t("booking.confirmedTitle")
          : t("booking.manageTitle")}
      </h1>
      {isNew && booking.status === "pending" ? (
        <p className="mt-2 text-pretty text-muted-foreground">
          {t("booking.pendingSubtitle")}
        </p>
      ) : null}

      {/* The booking reads as a ticket: coloured header strip, code, details. */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-float">
        <div
          className={cn(
            "px-6 py-5",
            cancelled
              ? "bg-muted"
              : confirmed
                ? "bg-gradient-sea"
                : "bg-gradient-sun",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "font-display text-xl leading-tight font-extrabold",
                  cancelled ? "text-foreground" : "text-white",
                )}
              >
                {restaurantName}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm font-medium",
                  cancelled ? "text-muted-foreground" : "text-white/85",
                )}
              >
                {day} · {time}
              </p>
            </div>
            {/* Status is spelled out, never colour alone */}
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap",
                cancelled
                  ? "bg-destructive/15 text-destructive"
                  : "bg-white/25 text-white backdrop-blur-sm",
              )}
            >
              {t("booking.statusLabel", { status: booking.status })}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-border bg-muted/60 px-4 py-3 text-center">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("booking.confirmationCode")}
            </p>
            <p
              className={cn(
                "mt-1 font-display text-2xl font-extrabold tracking-[0.28em]",
                cancelled ? "text-muted-foreground line-through" : "text-coral",
              )}
            >
              {booking.confirmation_code}
            </p>
          </div>

          <dl className="grid gap-2.5 text-sm">
            <Row label={t("home.partySize")}>
              {t("common.guests", { count: booking.party_size })}
            </Row>
            <Row label={t("booking.name")}>{booking.guest_name}</Row>
            {booking.restaurant_address ? (
              <Row label={t("restaurant.location")}>
                {booking.restaurant_address}
              </Row>
            ) : null}
            {booking.special_requests ? (
              <Row label={t("booking.specialRequests")}>
                <span className="italic">“{booking.special_requests}”</span>
              </Row>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/ics/${token}?l=${locale}`}>
                <CalendarPlus data-icon="inline-start" />
                {t("booking.addToCalendar")}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${booking.restaurant_lat},${booking.restaurant_lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin data-icon="inline-start" />
                {t("restaurant.getDirections")}
              </a>
            </Button>
          </div>

          {cancellable ? <CancelBookingButton token={token} /> : null}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2.5 last:border-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
