import { setRequestLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { requireActiveRestaurant } from "@/lib/dashboard/guard";
import { createClient } from "@/lib/supabase/server";
import { getAvailability } from "@/lib/booking/availability";
import { RulesForm } from "./rules-form";
import { PeriodsEditor, type PeriodRow } from "./periods-editor";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { active } = await requireActiveRestaurant(locale);
  const { restaurant } = active;

  const sb = await createClient();
  const [{ data: r }, { data: periods }] = await Promise.all([
    sb
      .from("restaurants")
      .select(
        "min_party, max_party, lead_time_minutes, max_advance_days, turn_minutes, slot_interval_minutes",
      )
      .eq("id", restaurant.id)
      .maybeSingle(),
    sb
      .from("service_periods")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("first_seating"),
  ]);

  // Live preview: what get_availability would offer tomorrow for 2.
  const tomorrow = formatInTimeZone(
    addDays(new Date(), 1),
    restaurant.timezone,
    "yyyy-MM-dd",
  );
  let previewSlots: string[] = [];
  try {
    const slots = await getAvailability(restaurant.id, tomorrow, 2);
    previewSlots = slots
      .filter((s) => s.available)
      .map((s) => s.slot_local.slice(0, 5));
  } catch {
    previewSlots = [];
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          {t("dashboard.availability")}
        </h1>
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{t("dashboard.previewTitle")}</p>
          {previewSlots.length ? (
            <p className="mt-1 text-sm text-olive">{previewSlots.join(" · ")}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboard.previewNone")}
            </p>
          )}
        </div>
      </div>

      {r ? <RulesForm restaurantId={restaurant.id} initial={r} /> : null}

      <PeriodsEditor
        restaurantId={restaurant.id}
        periods={(periods ?? []) as unknown as PeriodRow[]}
      />
    </div>
  );
}
