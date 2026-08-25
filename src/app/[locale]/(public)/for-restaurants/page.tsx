import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CalendarCheck, Settings2, HandCoins } from "lucide-react";
import { ContactForm } from "./contact-form";
import { BRAND } from "@/config/brand";

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forRestaurants" });
  return { title: t("title") };
}

export default async function ForRestaurantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forRestaurants");

  const bullets = [
    { icon: CalendarCheck, text: t("bullet1") },
    { icon: Settings2, text: t("bullet2") },
    { icon: HandCoins, text: t("bullet3") },
  ];

  return (
    <div className="grid gap-10 py-12 lg:grid-cols-2">
      <div>
        <h1 className="font-heading text-4xl leading-tight font-bold text-balance">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("subtitle", { brand: BRAND.name })}</p>
        <ul className="mt-8 space-y-4">
          {bullets.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-olive" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-2xl font-semibold">
          {t("formTitle")}
        </h2>
        <div className="mt-4">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
