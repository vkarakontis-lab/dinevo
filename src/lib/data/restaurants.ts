import { createPublicClient } from "@/lib/supabase/public";
import type { Json } from "@/lib/supabase/database.types";
import {
  demoBySlug,
  demoList,
  demoNameFor,
  isDemoMode,
} from "@/lib/demo/data";

// All public reads live here — typed query functions, never inline in
// components. Every function degrades to empty data if Supabase is
// unreachable (e.g. fresh checkout without keys) so pages still render.

export type PhotoData = {
  storage_path: string;
  blur_data_url: string | null;
  alt: Json | null;
  sort_order: number;
  is_cover: boolean;
};

export type TranslationData = {
  locale: string;
  name: string;
  tagline: string | null;
  description: string | null;
  is_machine_translated: boolean;
};

export type RestaurantListItem = {
  id: string;
  slug: string;
  price_band: number;
  lat: number;
  lng: number;
  features: string[];
  is_featured: boolean;
  booking_mode: string;
  timezone: string;
  rating: number | null;
  review_count: number;
  restaurant_translations: TranslationData[];
  photos: PhotoData[];
  restaurant_cuisines: { cuisine_slug: string; is_primary: boolean }[];
  regions: { slug: string } | null;
  areas: { slug: string } | null;
};

export type RestaurantProfile = RestaurantListItem & {
  country_code: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  menu_url: string | null;
  google_maps_url: string | null;
  address_line: string | null;
  postcode: string | null;
  min_party: number;
  max_party: number;
  max_advance_days: number;
  updated_at: string;
  opening_hours: { weekday: number; opens: string; closes: string }[];
};

const LIST_SELECT = `id, slug, price_band, lat, lng, features, is_featured, booking_mode, timezone, rating, review_count,
  restaurant_translations(locale, name, tagline, description, is_machine_translated),
  photos(storage_path, blur_data_url, alt, sort_order, is_cover),
  restaurant_cuisines(cuisine_slug, is_primary)`;

export type ListFilters = {
  regionSlug?: string;
  areaSlug?: string;
  cuisineSlug?: string;
  priceBands?: number[];
  features?: string[];
  countryCode?: string;
  limit?: number;
};

export async function getPublishedRestaurants(
  filters: ListFilters,
): Promise<RestaurantListItem[]> {
  if (isDemoMode()) return demoList(filters);
  try {
    const sb = createPublicClient();

    let select = LIST_SELECT;
    select += filters.regionSlug ? `, regions!inner(slug)` : `, regions(slug)`;
    select += filters.areaSlug ? `, areas!inner(slug)` : `, areas(slug)`;
    if (filters.cuisineSlug) {
      // Second embed of the join table under an alias, used only to filter.
      select += `, cuisine_filter:restaurant_cuisines!inner(cuisine_slug)`;
    }

    let query = sb
      .from("restaurants")
      .select(select)
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(filters.limit ?? 60);

    if (filters.countryCode) query = query.eq("country_code", filters.countryCode);
    if (filters.regionSlug) query = query.eq("regions.slug", filters.regionSlug);
    if (filters.areaSlug) query = query.eq("areas.slug", filters.areaSlug);
    if (filters.cuisineSlug)
      query = query.eq("cuisine_filter.cuisine_slug", filters.cuisineSlug);
    if (filters.priceBands?.length)
      query = query.in("price_band", filters.priceBands);
    if (filters.features?.length)
      query = query.contains("features", filters.features);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as RestaurantListItem[];
  } catch {
    return [];
  }
}

export async function getFeaturedRestaurants(
  countryCode: string,
  limit = 6,
): Promise<RestaurantListItem[]> {
  if (isDemoMode()) return demoList({}).slice(0, limit);
  try {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("restaurants")
      .select(`${LIST_SELECT}, regions(slug), areas(slug)`)
      .eq("status", "published")
      .eq("country_code", countryCode)
      .eq("is_featured", true)
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as RestaurantListItem[];
  } catch {
    return [];
  }
}

export async function getRestaurantBySlug(
  slug: string,
): Promise<RestaurantProfile | null> {
  if (isDemoMode()) return demoBySlug(slug);
  try {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("restaurants")
      .select(
        `id, slug, country_code, price_band, lat, lng, features, is_featured, booking_mode, timezone, rating, review_count,
         phone, whatsapp, website, instagram, menu_url, google_maps_url, address_line, postcode,
         min_party, max_party, max_advance_days, updated_at,
         restaurant_translations(locale, name, tagline, description, is_machine_translated),
         photos(storage_path, blur_data_url, alt, sort_order, is_cover),
         restaurant_cuisines(cuisine_slug, is_primary),
         opening_hours(weekday, opens, closes),
         regions(slug), areas(slug)`,
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return data as unknown as RestaurantProfile | null;
  } catch {
    return null;
  }
}

export async function getNearbyRestaurants(
  restaurant: Pick<RestaurantProfile, "id" | "regions">,
  limit = 4,
): Promise<RestaurantListItem[]> {
  if (!restaurant.regions?.slug) return [];
  const all = await getPublishedRestaurants({
    regionSlug: restaurant.regions.slug,
    limit: limit + 1,
  });
  return all.filter((r) => r.id !== restaurant.id).slice(0, limit);
}

export async function getRestaurantName(
  restaurantId: string,
  locale: string,
): Promise<string | null> {
  if (isDemoMode()) return demoNameFor(restaurantId, locale);
  try {
    const sb = createPublicClient();
    const { data } = await sb
      .from("restaurant_translations")
      .select("locale, name")
      .eq("restaurant_id", restaurantId);
    if (!data?.length) return null;
    return (
      data.find((t) => t.locale === locale)?.name ??
      data.find((t) => t.locale === "en")?.name ??
      data[0].name
    );
  } catch {
    return null;
  }
}

// ---- helpers shared by cards/pages ----

export function translationFor(
  r: { restaurant_translations: TranslationData[] },
  locale: string,
): TranslationData | undefined {
  return (
    r.restaurant_translations.find((t) => t.locale === locale) ??
    r.restaurant_translations.find((t) => t.locale === "en") ??
    r.restaurant_translations[0]
  );
}

export function coverPhoto(r: { photos: PhotoData[] }): PhotoData | undefined {
  const sorted = [...r.photos].sort((a, b) => a.sort_order - b.sort_order);
  return sorted.find((p) => p.is_cover) ?? sorted[0];
}

export function primaryCuisine(r: {
  restaurant_cuisines: { cuisine_slug: string; is_primary: boolean }[];
}): string | undefined {
  return (
    r.restaurant_cuisines.find((c) => c.is_primary)?.cuisine_slug ??
    r.restaurant_cuisines[0]?.cuisine_slug
  );
}

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
