import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, UtensilsCrossed } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { photoUrl } from "@/lib/photo";
import { getArea, getCuisine, localized } from "@/lib/data/config";
import {
  coverPhoto,
  primaryCuisine,
  translationFor,
  type RestaurantListItem,
} from "@/lib/data/restaurants";
import { PriceBand } from "./price-band";
import { RatingStars } from "./rating-stars";
import { featureIcon } from "./feature-icon";
import { getFeature } from "@/lib/data/config";
import type { AvailabilitySlot } from "@/lib/supabase/database.types";

const CUISINE_HUES = ["grape", "sea", "pink", "soft", "mint"] as const;

/**
 * Stable hue per cuisine so the same category always reads the same colour —
 * and so the server and the client agree (a random pick would hydrate-mismatch).
 */
function cuisineHue(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return CUISINE_HUES[Math.abs(hash) % CUISINE_HUES.length];
}

export async function RestaurantCard({
  restaurant,
  countrySlug,
  regionSlug,
  availability,
  bookingQuery,
  priority = false,
}: {
  restaurant: RestaurantListItem;
  countrySlug: string;
  regionSlug: string;
  // When the visitor searched with date+party, cards show tappable times.
  availability?: AvailabilitySlot[];
  bookingQuery?: { date: string; party: number };
  priority?: boolean;
}) {
  const locale = await getLocale();
  const t = await getTranslations();

  const tr = translationFor(restaurant, locale);
  const cover = coverPhoto(restaurant);
  const cuisine = getCuisine(primaryCuisine(restaurant) ?? "");
  const area = restaurant.areas?.slug
    ? getArea(countrySlug, regionSlug, restaurant.areas.slug)?.area
    : undefined;
  const alt =
    (cover?.alt as Record<string, string> | null)?.[locale] ?? tr?.name ?? "";
  const freeSlots = (availability ?? []).filter((s) => s.available).slice(0, 4);
  const topFeatures = restaurant.features.slice(0, 2);

  return (
    <article className="lift ring-gradient group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <Link href={`/restaurant/${restaurant.slug}`} className="block">
        <div className="relative aspect-4/3 w-full overflow-hidden">
          {cover ? (
            <Image
              src={photoUrl(cover.storage_path, 800)}
              alt={alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              placeholder={cover.blur_data_url ? "blur" : "empty"}
              blurDataURL={cover.blur_data_url ?? undefined}
              priority={priority}
            />
          ) : (
            <div
              className="flex h-full items-center justify-center bg-[linear-gradient(140deg,var(--coral-soft)_0%,var(--grape-soft)_100%)] text-coral"
              aria-hidden
            >
              <UtensilsCrossed className="size-10" />
            </div>
          )}

          {/* Foot of the photo darkened so the overlay pills always read */}
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(to_bottom,rgba(6,8,14,0.42)_0%,transparent_100%)]"
            aria-hidden
          />

          <PriceBand
            band={restaurant.price_band}
            className="glass-dark absolute top-3 left-3 rounded-full px-2.5 py-1 text-white"
            label={t("restaurant.priceBand", { band: restaurant.price_band })}
          />

          {restaurant.rating != null ? (
            <RatingStars
              rating={restaurant.rating}
              reviewCount={restaurant.review_count}
              className="glass-dark absolute top-3 right-3 rounded-full px-2.5 py-1 text-white"
              label={t("restaurant.rating", {
                rating: restaurant.rating,
                count: restaurant.review_count,
              })}
            />
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg leading-snug font-bold tracking-tight sm:text-xl">
            <Link
              href={`/restaurant/${restaurant.slug}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {tr?.name}
            </Link>
          </h3>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {area ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-sea" aria-hidden />
                {localized(area.name, locale)}
              </span>
            ) : null}
            {cuisine ? (
              <Badge variant={cuisineHue(cuisine.slug)}>
                {localized(cuisine.name, locale)}
              </Badge>
            ) : null}
          </p>
        </div>

        {topFeatures.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {topFeatures.map((f) => {
              const feature = getFeature(f);
              if (!feature) return null;
              const Icon = featureIcon(feature.icon);
              return (
                <li key={f}>
                  <Badge variant="outline" className="font-medium">
                    <Icon className="size-3.5" aria-hidden />
                    {localized(feature.name, locale)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : null}

        {freeSlots.length > 0 && bookingQuery ? (
          // Slot links sit above the card-wide link overlay (relative + z) so
          // they stay independently tappable.
          <div className="relative z-10 mt-auto">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("search.availableAt")}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {freeSlots.map((s) => (
                <Link
                  key={s.slot}
                  href={{
                    pathname: `/restaurant/${restaurant.slug}`,
                    query: {
                      date: bookingQuery.date,
                      party: bookingQuery.party,
                      time: s.slot_local.slice(0, 5),
                    },
                  }}
                  className="rounded-full bg-mint px-3 py-1.5 text-sm font-bold text-mint-foreground tabular-nums transition-transform hover:scale-105"
                >
                  {s.slot_local.slice(0, 5)}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative z-10 mt-auto">
            <Button asChild variant="soft" size="sm" className="w-full">
              <Link href={`/restaurant/${restaurant.slug}`}>
                {t("common.bookATable")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
