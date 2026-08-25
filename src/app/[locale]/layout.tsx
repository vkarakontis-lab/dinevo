import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";
import { BRAND } from "@/config/brand";

// Both faces ship the Greek subset — /el must never fall back to system fonts.
// Inter carries body/UI text; Manrope is the display face for every heading,
// the wordmark and the big numbers (its 800 weight is the "hyper-modern" look).
const inter = Inter({
  subsets: ["latin", "greek"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "greek"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: {
      default: t("defaultTitle", { brand: BRAND.name }),
      template: `%s | ${BRAND.name}`,
    },
    description: t("defaultDescription"),
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
