import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import dynamicImport from "next/dynamic";
import { ChevronRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "@/components/restaurant/gallery";
import { OpenNowPill } from "@/components/restaurant/open-now-pill";
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

  const placeLabel = areaCtx
    ? localized(areaCtx.area.name, locale)
    : regionCtx
      ? localized(regionCtx.region.name, locale)
      : "";
  const priceLabel = t("restaurant.priceBand", {
    band: restaurant.price_band,
  });
  const ratingLabel =
    restaurant.rating != null
      ? t("restaurant.rating", {
          rating: restaurant.rating,
          count: restaurant.review_count,
        })
      : "";

  return (
    <div className="pt-5 pb-24 lg:pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb — also the fastest way back to the area listing */}
      <nav aria-label={t("search.breadcrumb")} className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="transition-colors hover:text-coral">
              {t("nav.home")}
            </Link>
          </li>
          {regionCtx ? (
            <li className="flex items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0" aria-hidden />
              <Link
                href={`/${countrySlug}/${regionCtx.region.slug}`}
                className="transition-colors hover:text-coral"
              >
                {localized(regionCtx.region.name, locale)}
              </Link>
            </li>
          ) : null}
          <li className="flex items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <span aria-current="page" className="text-foreground">
              {tr?.name}
            </span>
          </li>
        </ol>
      </nav>

      <Gallery photos={restaurant.photos} restaurantName={tr?.name ?? slug} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_390px]">
        <div className="min-w-0 space-y-8">
          <header>
            <h1 className="font-display text-3xl leading-tight font-extrabold text-balance sm:text-4xl lg:text-5xl">
              {tr?.name}
            </h1>

            {/* One metadata row: place, price, rating, open state */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              {placeLabel ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4 text-sea" aria-hidden />
                  {placeLabel}
                </span>
              ) : null}
              <PriceBand band={restaurant.price_band} label={priceLabel} />
              {restaurant.rating != null ? (
                <RatingStars
                  rating={restaurant.rating}
                  reviewCount={restaurant.review_count}
                  label={ratingLabel}
                />
              ) : null}
              <OpenNowPill
                hours={restaurant.opening_hours}
                timezone={restaurant.timezone}
              />
            </div>

            {tr?.tagline ? (
              <p className="mt-4 text-lg text-pretty">{tr.tagline}</p>
            ) : null}

            {cuisineBadges.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {cuisineBadges.map((c) => (
                  <Badge key={c!.slug} variant="secondary">
                    {localized(c!.name, locale)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </header>

          {tr?.description ? (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
              <h2 className="font-display text-xl font-bold">
                {t("restaurant.about")}
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line">
                {tr.description}
              </p>
              {tr.is_machine_translated ? (
                <p className="mt-3 text-xs text-muted-foreground italic">
                  {t("restaurant.machineTranslatedNotice")}
                </p>
              ) : null}
            </section>
          ) : null}

          {featureList.length > 0 ? (
            <section>
              <h2 className="font-display text-xl font-bold">
                {t("restaurant.goodToKnow")}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {featureList.map((f) => {
                  const Icon = featureIcon(f!.icon);
                  return (
                    <li
                      key={f!.slug}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-soft"
                    >
                      <Icon className="size-4 text-coral" aria-hidden />
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

          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            <div className="p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold">
                {t("restaurant.location")}
              </h2>
              {restaurant.address_line ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {restaurant.address_line}
                  {restaurant.postcode ? `, ${restaurant.postcode}` : ""}
                </p>
              ) : null}
            </div>
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
            <div className="p-5 sm:p-6">
              <ContactButtons restaurant={restaurant} />
            </div>
          </section>
        </div>

        <aside>
          <div className="lg:sticky lg:top-24">
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
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            {t("restaurant.similarNearby")}
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
