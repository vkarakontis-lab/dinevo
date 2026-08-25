import { getLocale, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { FilterBar, type FilterOption } from "./filter-bar";
import { ListingView } from "./listing-view";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import {
  cuisines as allCuisines,
  features as allFeatures,
  localized,
  type Country,
  type Region,
} from "@/lib/data/config";
import {
  getPublishedRestaurants,
  translationFor,
} from "@/lib/data/restaurants";
import { getAvailability } from "@/lib/booking/availability";
import type { AvailabilitySlot } from "@/lib/supabase/database.types";
import type { MapMarker } from "@/components/map/map-view";

export type ListingSearchParams = {
  area?: string;
  cuisine?: string;
  price?: string;
  features?: string;
  date?: string;
  party?: string;
};

// Shared by region, area and cuisine listing pages.
export async function RestaurantListing({
  country,
  region,
  areaSlug,
  cuisineSlug,
  placeLabel,
  searchParams,
  showAreaFilter = true,
}: {
  country: Country;
  region?: Region;
  areaSlug?: string;
  cuisineSlug?: string;
  placeLabel: string;
  searchParams: ListingSearchParams;
  showAreaFilter?: boolean;
}) {
  const locale = await getLocale();
  const t = await getTranslations();

  const effectiveArea = areaSlug ?? searchParams.area;
  const effectiveCuisine = cuisineSlug ?? searchParams.cuisine;
  const priceBands = (searchParams.price ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 1 && n <= 4);
  const featureFilters = (searchParams.features ?? "")
    .split(",")
    .filter(Boolean);

  const restaurants = await getPublishedRestaurants({
    countryCode: country.code,
    regionSlug: region?.slug,
    areaSlug: effectiveArea,
    cuisineSlug: effectiveCuisine,
    priceBands: priceBands.length ? priceBands : undefined,
    features: featureFilters.length ? featureFilters : undefined,
  });

  // With date + party in the URL, cards show tappable free times.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "")
    ? searchParams.date!
    : undefined;
  const party = Number(searchParams.party) || 2;
  const availability = new Map<string, AvailabilitySlot[]>();
  if (date) {
    const subset = restaurants.slice(0, 20);
    const results = await Promise.all(
      subset.map(async (r): Promise<[string, AvailabilitySlot[]]> => {
        try {
          return [r.id, await getAvailability(r.id, date, party)];
        } catch {
          return [r.id, []];
        }
      }),
    );
    for (const [id, slots] of results) availability.set(id, slots);
  }

  const areaOptions: FilterOption[] = (region?.areas ?? []).map((a) => ({
    slug: a.slug,
    label: localized(a.name, locale),
  }));
  const cuisineOptions: FilterOption[] = allCuisines.map((c) => ({
    slug: c.slug,
    label: localized(c.name, locale),
  }));
  const featureOptions: FilterOption[] = allFeatures.map((f) => ({
    slug: f.slug,
    label: localized(f.name, locale),
  }));

  const markers: MapMarker[] = restaurants.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: translationFor(r, locale)?.name ?? r.slug,
    lat: r.lat,
    lng: r.lng,
    href: getPathname({ locale, href: `/restaurant/${r.slug}` }),
  }));

  const center = region
    ? { lat: region.lat, lng: region.lng }
    : markers[0]
      ? { lat: markers[0].lat, lng: markers[0].lng }
      : { lat: 35.0, lng: 33.2 };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: restaurants.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: translationFor(r, locale)?.name,
      url: `${siteUrl}/${locale}/restaurant/${r.slug}`,
    })),
  };

  return (
    <div className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <h1 className="font-heading text-3xl font-bold">
        {t("search.resultsTitle", {
          count: restaurants.length,
          place: placeLabel,
        })}
      </h1>
      <div className="mt-4">
        <FilterBar
          areas={areaOptions}
          cuisines={cuisineSlug ? [] : cuisineOptions}
          features={featureOptions}
          showAreaFilter={showAreaFilter && !areaSlug && areaOptions.length > 0}
        />
      </div>
      <div className="mt-6">
        {restaurants.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            {t("search.noResults")}
          </p>
        ) : (
          <ListingView markers={markers} center={center}>
            {restaurants.map((r, i) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                countrySlug={country.slug}
                regionSlug={region?.slug ?? r.regions?.slug ?? ""}
                availability={date ? availability.get(r.id) : undefined}
                bookingQuery={date ? { date, party } : undefined}
                priority={i === 0}
              />
            ))}
          </ListingView>
        )}
      </div>
    </div>
  );
}
