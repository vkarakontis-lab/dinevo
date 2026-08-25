import { setRequestLocale, getTranslations, getLocale } from "next-intl/server";
import { requireActiveRestaurant } from "@/lib/dashboard/guard";
import { createClient } from "@/lib/supabase/server";
import { ClosuresEditor, type ClosureRow } from "./closures-editor";

export default async function ClosuresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const displayLocale = await getLocale();
  const { active } = await requireActiveRestaurant(locale);
  const { restaurant } = active;

  const sb = await createClient();
  const { data: closures } = await sb
    .from("closures")
    .select("id, starts_at, ends_at, reason")
    .eq("restaurant_id", restaurant.id)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">{t("closures")}</h1>
      <ClosuresEditor
        restaurantId={restaurant.id}
        timezone={restaurant.timezone}
        displayLocale={displayLocale}
        closures={(closures ?? []) as ClosureRow[]}
      />
    </div>
  );
}
