import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireActiveRestaurant } from "@/lib/dashboard/guard";
import { createClient } from "@/lib/supabase/server";
import { TablesEditor, type TableRow } from "./tables-editor";

export default async function TablesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const { active } = await requireActiveRestaurant(locale);
  const { restaurant } = active;

  const sb = await createClient();
  const [{ data: tables }, { data: r }] = await Promise.all([
    sb
      .from("dining_tables")
      .select("id, label, min_party, max_party, is_online_bookable, is_active")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order")
      .order("label"),
    sb
      .from("restaurants")
      .select("tables_are_placeholder")
      .eq("id", restaurant.id)
      .maybeSingle(),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">{t("tables")}</h1>
      <TablesEditor
        restaurantId={restaurant.id}
        tables={(tables ?? []) as TableRow[]}
        placeholderWarning={!!r?.tables_are_placeholder}
      />
    </div>
  );
}
