import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { countries, getArea, localized } from "@/lib/data/config";
import {
  RestaurantListing,
  type ListingSearchParams,
} from "@/components/search/restaurant-listing";
import { localeAlternates } from "@/lib/seo";

export const revalidate = 300;

type Props = {
  params: Promise<{
    locale: string;
    country: string;
    region: string;
    area: string;
  }>;
  searchParams: Promise<ListingSearchParams>;
};

export function generateStaticParams() {
  return countries.flatMap((c) =>
    c.regions.flatMap((r) =>
      r.areas.map((a) => ({ country: c.slug, region: r.slug, area: a.slug })),
    ),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, country, region, area } = await params;
  const ctx = getArea(country, region, area);
  if (!ctx) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: t("regionTitle", { region: localized(ctx.area.name, locale) }),
    description: t("regionDescription", {
      region: localized(ctx.area.name, locale),
      country: localized(ctx.country.name, locale),
    }),
    alternates: localeAlternates(`/${country}/${region}/${area}`, locale),
  };
}

export default async function AreaPage({ params, searchParams }: Props) {
  const { locale, country, region, area } = await params;
  setRequestLocale(locale);
  const ctx = getArea(country, region, area);
  if (!ctx) notFound();

  return (
    <RestaurantListing
      country={ctx.country}
      region={ctx.region}
      areaSlug={ctx.area.slug}
      placeLabel={localized(ctx.area.name, locale)}
      searchParams={await searchParams}
    />
  );
}
