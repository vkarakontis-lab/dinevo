import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { countries, getRegion, localized } from "@/lib/data/config";
import {
  RestaurantListing,
  type ListingSearchParams,
} from "@/components/search/restaurant-listing";
import { localeAlternates } from "@/lib/seo";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string; country: string; region: string }>;
  searchParams: Promise<ListingSearchParams>;
};

export function generateStaticParams() {
  return countries.flatMap((c) =>
    c.regions.map((r) => ({ country: c.slug, region: r.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, country, region } = await params;
  const ctx = getRegion(country, region);
  if (!ctx) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: t("regionTitle", { region: localized(ctx.region.name, locale) }),
    description: t("regionDescription", {
      region: localized(ctx.region.name, locale),
      country: localized(ctx.country.name, locale),
    }),
    alternates: localeAlternates(`/${country}/${region}`, locale),
  };
}

export default async function RegionPage({ params, searchParams }: Props) {
  const { locale, country, region } = await params;
  setRequestLocale(locale);
  const ctx = getRegion(country, region);
  if (!ctx) notFound();

  return (
    <RestaurantListing
      country={ctx.country}
      region={ctx.region}
      placeLabel={localized(ctx.region.name, locale)}
      searchParams={await searchParams}
    />
  );
}
