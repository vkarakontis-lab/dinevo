import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  countries,
  cuisines,
  getCountry,
  getCuisine,
  localized,
} from "@/lib/data/config";
import {
  RestaurantListing,
  type ListingSearchParams,
} from "@/components/search/restaurant-listing";
import { localeAlternates } from "@/lib/seo";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string; country: string; cuisine: string }>;
  searchParams: Promise<ListingSearchParams>;
};

export function generateStaticParams() {
  return countries.flatMap((c) =>
    cuisines.map((cu) => ({ country: c.slug, cuisine: cu.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, country, cuisine } = await params;
  const countryCfg = getCountry(country);
  const cuisineCfg = getCuisine(cuisine);
  if (!countryCfg || !cuisineCfg) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: t("cuisineTitle", {
      cuisine: localized(cuisineCfg.name, locale),
      place: localized(countryCfg.name, locale),
    }),
    alternates: localeAlternates(`/${country}/cuisine/${cuisine}`, locale),
  };
}

export default async function CuisinePage({ params, searchParams }: Props) {
  const { locale, country, cuisine } = await params;
  setRequestLocale(locale);
  const countryCfg = getCountry(country);
  const cuisineCfg = getCuisine(cuisine);
  if (!countryCfg || !cuisineCfg) notFound();

  return (
    <RestaurantListing
      country={countryCfg}
      cuisineSlug={cuisineCfg.slug}
      placeLabel={localized(countryCfg.name, locale)}
      searchParams={await searchParams}
      showAreaFilter={false}
    />
  );
}
