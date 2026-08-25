import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireActiveRestaurant } from "@/lib/dashboard/guard";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage({
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
  const { data: r } = await sb
    .from("restaurants")
    .select(
      "phone, whatsapp, email, website, instagram, menu_url, restaurant_translations(locale, name, tagline, description, is_machine_translated)",
    )
    .eq("id", restaurant.id)
    .maybeSingle();
  if (!r) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold">{t("profile")}</h1>
      <ProfileForm
        restaurantId={restaurant.id}
        contact={{
          phone: r.phone ?? "",
          whatsapp: r.whatsapp ?? "",
          email: r.email ?? "",
          website: r.website ?? "",
          instagram: r.instagram ?? "",
          menu_url: r.menu_url ?? "",
        }}
        translations={(
          r.restaurant_translations as {
            locale: string;
            name: string;
            tagline: string | null;
            description: string | null;
            is_machine_translated: boolean;
          }[]
        ).sort((a, b) => a.locale.localeCompare(b.locale))}
      />
    </div>
  );
}
