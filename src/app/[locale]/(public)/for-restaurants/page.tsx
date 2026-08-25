import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  HandCoins,
  Languages,
  Settings2,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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

  const benefits = [
    { icon: CalendarCheck, text: t("bullet1") },
    { icon: Settings2, text: t("bullet2") },
    { icon: HandCoins, text: t("bullet3") },
    { icon: BellRing, text: t("bullet4") },
    { icon: Languages, text: t("bullet5") },
    { icon: Users, text: t("bullet6") },
  ];

  const steps = [
    { title: t("howStep1Title"), body: t("howStep1Body") },
    { title: t("howStep2Title"), body: t("howStep2Body") },
    { title: t("howStep3Title"), body: t("howStep3Body") },
  ];

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="mesh-aurora relative mt-4 overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-14 shadow-soft sm:px-12 sm:py-20">
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-grape uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] font-extrabold text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">
            {t("subtitle", { brand: BRAND.name })}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="brand" size="lg">
              <a href="#listing-form">
                {t("ctaForm")}
                <ArrowRight data-icon="inline-end" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">{t("ctaDashboard")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section">
        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              <span
                className="flex size-11 items-center justify-center rounded-2xl bg-coral-soft text-coral"
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <p className="mt-4 text-pretty">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works for owners */}
      <section className="section">
        <p className="text-xs font-semibold tracking-[0.18em] text-sea uppercase">
          {t("howTitle")}
        </p>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
          {t("howLead")}
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              {/* Decorative — the ordered list already conveys the sequence */}
              <span
                className="pointer-events-none absolute -top-3 -right-1 bg-gradient-brand bg-clip-text font-display text-[5.5rem] leading-none font-extrabold text-transparent opacity-15"
                aria-hidden
              >
                {i + 1}
              </span>
              <h3 className="font-display text-xl font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Form */}
      <section className="section" id="listing-form">
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 shadow-float sm:p-8">
          <h2 className="font-display text-2xl font-extrabold">
            {t("formTitle")}
          </h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
