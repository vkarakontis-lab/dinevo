import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { defaultCountry } from "@/lib/data/config";
import { addLocalDays, localDayStart } from "@/lib/dashboard/bookings";
import { getDashboardContext } from "@/lib/dashboard/context";
import { Badge } from "@/components/ui/badge";
import { AdminRestaurantActions } from "./restaurant-actions";
import { cn } from "@/lib/utils";

// Platform admin: every restaurant, every status, plus today's pulse.
// Enough to feel the business — richer reporting can come from `bookings`
// later without schema changes.
export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/dashboard/login`);
  if (!ctx.isAdmin) redirect(`/${locale}/dashboard`);

  const sb = await createClient();
  // "Today" in the launch country's time zone, not the server's.
  const today = formatInTimeZone(
    new Date(),
    defaultCountry.timezone,
    "yyyy-MM-dd",
  );
  const dayStart = localDayStart(today, defaultCountry.timezone);
  const dayEnd = localDayStart(
    addLocalDays(today, 1),
    defaultCountry.timezone,
  );

  const [{ data: restaurants }, { data: todayBookings }] = await Promise.all([
    sb
      .from("restaurants")
      .select(
        "id, slug, status, is_featured, booking_mode, restaurant_translations(locale, name)",
      )
      .order("created_at"),
    sb
      .from("bookings")
      .select("restaurant_id, party_size, status")
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString()),
  ]);

  const coversByRestaurant = new Map<string, number>();
  for (const b of todayBookings ?? []) {
    if (b.status === "cancelled" || b.status === "no_show") continue;
    coversByRestaurant.set(
      b.restaurant_id,
      (coversByRestaurant.get(b.restaurant_id) ?? 0) + b.party_size,
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">
        {t("adminRestaurants")}
      </h1>
      <div className="mt-5 space-y-2">
        {(restaurants ?? []).map((r) => {
          const name =
            (
              r.restaurant_translations as { locale: string; name: string }[]
            ).find((x) => x.locale === "en")?.name ?? r.slug;
          return (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  /{r.slug} · {r.booking_mode}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {t("covers", {
                  count: coversByRestaurant.get(r.id) ?? 0,
                })}
              </span>
              <Badge
                className={cn(
                  r.status === "published"
                    ? "bg-olive text-olive-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {r.status}
              </Badge>
              {r.is_featured ? <Badge variant="outline">★</Badge> : null}
              <AdminRestaurantActions
                restaurantId={r.id}
                status={r.status}
                isFeatured={r.is_featured}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
