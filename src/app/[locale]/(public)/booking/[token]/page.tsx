import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CalendarPlus, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantName } from "@/lib/data/restaurants";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="mx-auto max-w-lg py-10">
      <h1 className="font-heading text-3xl font-bold">
        {isNew
          ? booking.status === "pending"
            ? t("booking.pendingTitle")
            : t("booking.confirmedTitle")
          : t("booking.manageTitle")}
      </h1>
      {isNew && booking.status === "pending" ? (
        <p className="mt-2 text-muted-foreground">
          {t("booking.pendingSubtitle")}
        </p>
      ) : null}

      <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-xl font-semibold">
              {restaurantName}
            </p>
            <p className="mt-1 text-muted-foreground">
              {day} · {time}
            </p>
            <p className="text-muted-foreground">
              {t("common.guests", { count: booking.party_size })} ·{" "}
              {booking.guest_name}
            </p>
            {booking.special_requests ? (
              <p className="mt-2 text-sm text-muted-foreground italic">
                “{booking.special_requests}”
              </p>
            ) : null}
          </div>
          <Badge
            className={cn(
              booking.status === "confirmed" || booking.status === "seated"
                ? "bg-olive text-olive-foreground"
                : booking.status === "cancelled" || booking.status === "no_show"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-secondary text-secondary-foreground",
            )}
          >
            {t("booking.statusLabel", { status: booking.status })}
          </Badge>
        </div>

        <div className="rounded-lg bg-secondary p-3">
          <p className="text-xs text-muted-foreground">
            {t("booking.confirmationCode")}
          </p>
          <p className="text-lg font-bold tracking-widest text-terracotta">
            {booking.confirmation_code}
          </p>
        </div>

        {booking.restaurant_address ? (
          <p className="text-sm text-muted-foreground">
            {booking.restaurant_address}
          </p>
        ) : null}

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
  );
}
