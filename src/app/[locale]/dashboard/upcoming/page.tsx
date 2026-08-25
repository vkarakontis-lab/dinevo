import { setRequestLocale, getTranslations, getLocale } from "next-intl/server";
import { requireActiveRestaurant } from "@/lib/dashboard/guard";
import { getUpcomingBookings } from "@/lib/dashboard/bookings";
import { formatBookingDay, formatLocalDate } from "@/lib/dates";
import { BookingRow } from "../booking-row";

export default async function UpcomingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const displayLocale = await getLocale();
  const { active } = await requireActiveRestaurant(locale);
  const { restaurant } = active;

  const bookings = await getUpcomingBookings(restaurant.id, restaurant.timezone);
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const day = formatLocalDate(b.starts_at, restaurant.timezone);
    byDay.set(day, [...(byDay.get(day) ?? []), b]);
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">
        {t("dashboard.upcoming")}
      </h1>
      {bookings.length === 0 ? (
        <p className="mt-5 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          {t("dashboard.noBookings")}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {[...byDay.entries()].map(([day, dayBookings]) => (
            <section key={day}>
              <h2 className="mb-2 font-heading text-lg font-semibold capitalize">
                {formatBookingDay(
                  dayBookings[0].starts_at,
                  restaurant.timezone,
                  displayLocale,
                )}
              </h2>
              <div className="space-y-3">
                {dayBookings.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    restaurantId={restaurant.id}
                    timezone={restaurant.timezone}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
