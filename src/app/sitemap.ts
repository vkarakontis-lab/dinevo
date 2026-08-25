import type { MetadataRoute } from "next";
import { countries, cuisines } from "@/lib/data/config";
import { getPublishedRestaurants } from "@/lib/data/restaurants";
import { routing } from "@/i18n/routing";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function entry(path: string, lastModified?: string): MetadataRoute.Sitemap[number][] {
  // One entry per locale, each carrying alternates for the rest.
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${site()}/${l}${path}`;
  return routing.locales.map((l) => ({
    url: `${site()}/${l}${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  entries.push(...entry(""));
  entries.push(...entry("/for-restaurants"));

  for (const country of countries) {
    for (const region of country.regions) {
      entries.push(...entry(`/${country.slug}/${region.slug}`));
      for (const area of region.areas) {
        entries.push(...entry(`/${country.slug}/${region.slug}/${area.slug}`));
      }
    }
    for (const cuisine of cuisines) {
      entries.push(...entry(`/${country.slug}/cuisine/${cuisine.slug}`));
    }
  }

  const restaurants = await getPublishedRestaurants({ limit: 5000 });
  for (const r of restaurants) {
    entries.push(...entry(`/restaurant/${r.slug}`));
  }

  return entries;
}
