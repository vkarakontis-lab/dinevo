import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getDashboardContext } from "@/lib/dashboard/context";
import { getBookingsForDay } from "@/lib/dashboard/bookings";
import { formatBookingTime } from "@/lib/dates";
import { BookingRow } from "./booking-row";
import { WalkInButton } from "./walk-in-button";
import { RefreshButton } from "./refresh-button";

// "Today" — the screen staff live on during service.
export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/dashboard/login`);
  if (!ctx.active) {
    if (ctx.isAdmin) redirect(`/${locale}/admin`);
    return null; // layout renders the no-access state
  }

  const { restaurant } = ctx.active;
  const bookings = await getBookingsForDay(restaurant.id, restaurant.timezone);
  const live = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed" || b.status === "seated",
  );
  const covers = live.reduce((sum, b) => sum + b.party_size, 0);
  const next = live.find(
    (b) => b.status !== "seated" && new Date(b.starts_at) > new Date(),
  );

  return (
    <div>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {t("dashboard.today")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.covers", { count: covers })}
            {next
              ? ` · ${t("dashboard.nextArrival", {
                  time: formatBookingTime(next.starts_at, restaurant.timezone),
                })}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <RefreshButton label={t("dashboard.refresh")} />
          <WalkInButton restaurantId={restaurant.id} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {bookings.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            {t("dashboard.noBookings")}
          </p>
        ) : (
          bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              restaurantId={restaurant.id}
              timezone={restaurant.timezone}
            />
          ))
        )}
      </div>
    </div>
  );
}
