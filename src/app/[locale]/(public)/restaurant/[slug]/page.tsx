import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import dynamicImport from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "@/components/restaurant/gallery";
import { HoursBlock } from "@/components/restaurant/hours-block";
import { ContactButtons } from "@/components/restaurant/contact-buttons";
import { PriceBand } from "@/components/restaurant/price-band";
import { RatingStars } from "@/components/restaurant/rating-stars";
import { featureIcon } from "@/components/restaurant/feature-icon";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { BookingWidget } from "@/components/booking/booking-widget";
import {
  getNearbyRestaurants,
  getRestaurantBySlug,
  translationFor,
  coverPhoto,
} from "@/lib/data/restaurants";
import {
  getArea,
  getCountryByCode,
  getCuisine,
  getFeature,
  getRegion,
  localized,
} from "@/lib/data/config";
import { photoUrl } from "@/lib/photo";
import { localeAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";

const MapView = dynamicImport(() => import("@/components/map/map-view"));

export const revalidate = 300;

// searchParams is deliberately NOT read here — the BookingWidget reads
// ?date=&party=&time= client-side so this route stays statically renderable.
type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  const tr = translationFor(restaurant, locale);
  const countrySlug = getCountryByCode(restaurant.country_code)?.slug ?? "";
  const areaCtx =
    restaurant.areas?.slug && restaurant.regions?.slug
      ? getArea(countrySlug, restaurant.regions.slug, restaurant.areas.slug)
      : undefined;
  const areaLabel = areaCtx
    ? localized(areaCtx.area.name, locale)
    : restaurant.regions?.slug
      ? localized(
          getRegion(countrySlug, restaurant.regions.slug)?.region.name ?? {},
          locale,
        )
      : "";
  const cover = coverPhoto(restaurant);
  return {
    title: t("restaurantTitle", { name: tr?.name ?? slug, area: areaLabel }),
    description: t("restaurantDescription", { tagline: tr?.tagline ?? "" }),
    alternates: localeAlternates(`/restaurant/${slug}`, locale),
    openGraph: {
      images: cover ? [photoUrl(cover.storage_path, 1600)] : [],
      locale: locale === "el" ? "el_GR" : "en_GB",
    },
  };
}

export default async function RestaurantPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const tr = translationFor(restaurant, locale);
  const countryCfg = getCountryByCode(restaurant.country_code);
  const countrySlug = countryCfg?.slug ?? "";
  const regionCtx = restaurant.regions?.slug
    ? getRegion(countrySlug, restaurant.regions.slug)
    : undefined;
  const areaCtx =
    restaurant.areas?.slug && restaurant.regions?.slug
      ? getArea(countrySlug, restaurant.regions.slug, restaurant.areas.slug)
      : undefined;
  const nearby = await getNearbyRestaurants(restaurant);

  const cuisineBadges = restaurant.restaurant_cuisines
    .map((c) => getCuisine(c.cuisine_slug))
    .filter(Boolean);
  const featureList = restaurant.features
    .map((f) => getFeature(f))
    .filter(Boolean);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pageUrl = `${siteUrl}/${locale}/restaurant/${restaurant.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: tr?.name,
    inLanguage: locale,
    image: restaurant.photos
      .slice(0, 3)
      .map((p) => photoUrl(p.storage_path, 1600)),
    servesCuisine: cuisineBadges.map((c) => localized(c!.name, "en")),
    priceRange: "€".repeat(restaurant.price_band),
    telephone: restaurant.phone ?? undefined,
    url: pageUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.address_line ?? undefined,
      addressLocality: areaCtx
        ? localized(areaCtx.area.name, "en")
        : undefined,
      addressRegion: regionCtx
        ? localized(regionCtx.region.name, "en")
        : undefined,
      postalCode: restaurant.postcode ?? undefined,
      addressCountry: restaurant.country_code,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.lat,
      longitude: restaurant.lng,
    },
    openingHoursSpecification: restaurant.opening_hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ][h.weekday - 1],
      ],
      opens: h.opens.slice(0, 5),
      closes: h.closes.slice(0, 5),
    })),
    aggregateRating:
      restaurant.rating != null && restaurant.review_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: restaurant.rating,
            reviewCount: restaurant.review_count,
            bestRating: 5,
          }
        : undefined,
    acceptsReservations: pageUrl,
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: pageUrl,
        inLanguage: locale,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: {
        "@type": "FoodEstablishmentReservation",
        name: "Table reservation",
      },
    },
  };

  return (
    <div className="py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Gallery photos={restaurant.photos} restaurantName={tr?.name ?? slug} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <header>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">
              {tr?.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
              {areaCtx ? (
                <span>{localized(areaCtx.area.name, locale)}</span>
              ) : regionCtx ? (
                <span>{localized(regionCtx.region.name, locale)}</span>
              ) : null}
              <span aria-hidden>·</span>
              <PriceBand band={restaurant.price_band} />
              <span className="text-sm">
                {t("restaurant.priceBand", { band: restaurant.price_band })}
              </span>
              {/* the text next to it is the accessible label */}
            </p>
            {restaurant.rating != null ? (
              <div className="mt-2">
                <RatingStars
                  rating={restaurant.rating}
                  reviewCount={restaurant.review_count}
                  label={t("restaurant.rating", {
                    rating: restaurant.rating,
                    count: restaurant.review_count,
                  })}
                />
              </div>
            ) : null}
            {tr?.tagline ? (
              <p className="mt-3 text-lg text-balance">{tr.tagline}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cuisineBadges.map((c) => (
                <Badge key={c!.slug} variant="secondary">
                  {localized(c!.name, locale)}
                </Badge>
              ))}
            </div>
          </header>

          {tr?.description ? (
            <section>
              <h2 className="font-heading text-xl font-semibold">
                {t("restaurant.about")}
              </h2>
              <p className="mt-2 leading-relaxed whitespace-pre-line">
                {tr.description}
              </p>
              {tr.is_machine_translated ? (
                <p className="mt-2 text-xs text-muted-foreground italic">
                  {t("restaurant.machineTranslatedNotice")}
                </p>
              ) : null}
            </section>
          ) : null}

          {featureList.length > 0 ? (
            <section>
              <h2 className="font-heading text-xl font-semibold">
                {t("restaurant.goodToKnow")}
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {featureList.map((f) => {
                  const Icon = featureIcon(f!.icon);
                  return (
                    <li
                      key={f!.slug}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Icon className="size-4 text-olive" aria-hidden />
                      {localized(f!.name, locale)}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <HoursBlock
            hours={restaurant.opening_hours}
            timezone={restaurant.timezone}
          />

          <section>
            <h2 className="font-heading text-xl font-semibold">
              {t("restaurant.location")}
            </h2>
            {restaurant.address_line ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {restaurant.address_line}
                {restaurant.postcode ? `, ${restaurant.postcode}` : ""}
              </p>
            ) : null}
            <div className="mt-3">
              <MapView
                markers={[
                  {
                    id: restaurant.id,
                    slug: restaurant.slug,
                    name: tr?.name ?? "",
                    lat: restaurant.lat,
                    lng: restaurant.lng,
                    href: pageUrl,
                  },
                ]}
                center={{ lat: restaurant.lat, lng: restaurant.lng }}
                heightClass="h-64"
                zoom={14}
              />
            </div>
            <div className="mt-3">
              <ContactButtons restaurant={restaurant} />
            </div>
          </section>
        </div>

        <aside>
          <div className="lg:sticky lg:top-20">
            <BookingWidget
              restaurant={{
                id: restaurant.id,
                slug: restaurant.slug,
                name: tr?.name ?? "",
                timezone: restaurant.timezone,
                minParty: restaurant.min_party,
                maxParty: restaurant.max_party,
                maxAdvanceDays: restaurant.max_advance_days,
                phone: restaurant.phone,
                whatsapp: restaurant.whatsapp,
                bookingMode: restaurant.booking_mode,
              }}
            />
          </div>
        </aside>
      </div>

      {nearby.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-heading text-2xl font-semibold">
            {t("restaurant.similarNearby")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                countrySlug={countrySlug}
                regionSlug={r.regions?.slug ?? ""}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function generateStaticParams() {
  // Restaurant pages are dynamic (ISR via revalidate); locales prebuild.
  return routing.locales.map((locale) => ({ locale }));
}
