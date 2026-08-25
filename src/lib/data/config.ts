import countriesConfig from "@/config/countries.json";
import cuisinesConfig from "@/config/cuisines.json";
import featuresConfig from "@/config/features.json";

// Config is the source of truth for geography/taxonomy (seeded to the DB by
// scripts/seed-config.mjs). Pages read it directly — no query needed.

export type LocalizedName = Record<string, string>;

export type Area = {
  slug: string;
  name: LocalizedName;
  lat?: number;
  lng?: number;
};

export type Region = {
  slug: string;
  name: LocalizedName;
  lat: number;
  lng: number;
  areas: Area[];
};

export type Country = {
  code: string;
  slug: string;
  name: LocalizedName;
  // Inflected form for "in {country}" phrases (Greek: στην Κύπρο, not Κύπρος).
  name_locative?: LocalizedName;
  // Language restaurant staff read notifications in (el for Cyprus).
  staff_locale?: string;
  currency: string;
  timezone: string;
  phone_code: string;
  locales: string[];
  default_locale: string;
  bbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  is_active: boolean;
  regions: Region[];
};

export type Cuisine = {
  slug: string;
  name: LocalizedName;
  emoji?: string;
  sort_order?: number;
};
export type Feature = { slug: string; name: LocalizedName; icon?: string };

export const countries: Country[] = (
  countriesConfig.countries as Country[]
).filter((c) => c.is_active);

export const cuisines: Cuisine[] = cuisinesConfig.cuisines as Cuisine[];
export const features: Feature[] = featuresConfig.features as Feature[];

// One active country at launch; the home page renders it directly.
// When a second country activates, the home page becomes a country picker.
export const defaultCountry = countries[0];

export function localized(name: LocalizedName | null | undefined, locale: string): string {
  if (!name) return "";
  return name[locale] ?? name.en ?? Object.values(name)[0] ?? "";
}

// For "…in {country}" phrases: the inflected place form when the locale has
// one, otherwise the plain name.
export function localizedLocative(country: Country, locale: string): string {
  return (
    country.name_locative?.[locale] ?? localized(country.name, locale)
  );
}

export function getCountry(slug: string): Country | undefined {
  return countries.find((c) => c.slug === slug);
}

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function getRegion(countrySlug: string, regionSlug: string) {
  const country = getCountry(countrySlug);
  const region = country?.regions.find((r) => r.slug === regionSlug);
  return country && region ? { country, region } : undefined;
}

export function getArea(countrySlug: string, regionSlug: string, areaSlug: string) {
  const ctx = getRegion(countrySlug, regionSlug);
  const area = ctx?.region.areas.find((a) => a.slug === areaSlug);
  return ctx && area ? { ...ctx, area } : undefined;
}

export function getCuisine(slug: string): Cuisine | undefined {
  return cuisines.find((c) => c.slug === slug);
}

export function getFeature(slug: string): Feature | undefined {
  return features.find((f) => f.slug === slug);
}
