import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireActiveRestaurant } from "@/lib/dashboard/guard";
import { searchBookings } from "@/lib/dashboard/bookings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookingRow } from "../booking-row";

export default async function BookingsSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { active } = await requireActiveRestaurant(locale);
  const { restaurant } = active;
  const q = (await searchParams).q ?? "";
  const results = q ? await searchBookings(restaurant.id, q) : [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">
        {t("dashboard.bookings")}
      </h1>
      <form className="mt-4 flex max-w-md gap-2" action="">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("dashboard.searchPlaceholder")}
        />
        <Button type="submit">{t("common.search")}</Button>
      </form>
      <div className="mt-5 space-y-3">
        {q && results.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            {t("dashboard.noBookings")}
          </p>
        ) : (
          results.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              restaurantId={restaurant.id}
              timezone={restaurant.timezone}
              showDay
            />
          ))
        )}
      </div>
    </div>
  );
}
