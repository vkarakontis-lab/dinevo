import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SearchHero } from "@/components/search/search-hero";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import {
  cuisines,
  defaultCountry,
  localized,
  localizedLocative,
} from "@/lib/data/config";
import { localeAlternates } from "@/lib/seo";
import { getFeaturedRestaurants } from "@/lib/data/restaurants";
import { CuisineBrowser } from "@/components/home/cuisine-browser";
import { RegionTiles } from "@/components/home/region-tiles";
import { HowItWorks } from "@/components/home/how-it-works";
import { SectionHeading } from "@/components/home/section-heading";
import { Button } from "@/components/ui/button";
import cuisineArt from "../../../../public/images/cuisines/meta.json";

// Categories with photo cards (art in public/images/cuisines/<slug>.webp).
const FEATURED_CUISINES = [
  "seafood",
  "cypriot-meze",
  "taverna",
  "grill-souvlaki",
  "greek",
  "mediterranean",
];

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: t("homeTitle", {
      country: localizedLocative(defaultCountry, locale),
    }),
    alternates: localeAlternates("", locale),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const country = defaultCountry;
  const countryName = localizedLocative(country, locale);
  const places = country.regions.map((r) => ({
    regionSlug: r.slug,
    regionLabel: localized(r.name, locale),
    areas: r.areas.map((a) => ({
      slug: a.slug,
      label: localized(a.name, locale),
    })),
  }));

  const featured = await getFeaturedRestaurants(country.code);

  return (
    <>
      <SearchHero
        countrySlug={country.slug}
        countryName={countryName}
        timezone={country.timezone}
        places={places}
        cuisineOptions={cuisines.map((c) => ({
          slug: c.slug,
          label: localized(c.name, locale),
          emoji: c.emoji ?? "🍽️",
        }))}
      />

      <section className="section">
        <SectionHeading
          eyebrow={t("home.areaEyebrow")}
          hue="sea"
          title={t("home.browseByArea")}
          lead={t("home.browseByAreaLead")}
        />
        <div className="mt-6">
          <RegionTiles
            countrySlug={country.slug}
            regions={country.regions.map((region) => ({
              slug: region.slug,
              label: localized(region.name, locale),
              areas: region.areas
                .slice(0, 3)
                .map((a) => localized(a.name, locale)),
            }))}
          />
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow={t("home.cuisineEyebrow")}
          hue="pink"
          title={t("home.browseByCuisine")}
          lead={t("home.browseByCuisineLead")}
        />
        <div className="mt-6">
          <CuisineBrowser
            countrySlug={country.slug}
            cards={FEATURED_CUISINES.map((slug) => {
              const cuisine = cuisines.find((c) => c.slug === slug)!;
              const art = (
                cuisineArt as Record<
                  string,
                  { img: string; blurDataURL: string | null }
                >
              )[slug];
              return {
                slug,
                label: localized(cuisine.name, locale),
                emoji: cuisine.emoji ?? "🍽️",
                image: `/images/cuisines/${slug}.webp`,
                blurDataURL: art?.blurDataURL ?? undefined,
              };
            })}
            pills={cuisines
              .filter((c) => !FEATURED_CUISINES.includes(c.slug))
              .map((c) => ({
                slug: c.slug,
                label: localized(c.name, locale),
                emoji: c.emoji ?? "🍽️",
              }))}
          />
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="section">
          <SectionHeading
            eyebrow={t("home.featuredEyebrow")}
            hue="sun"
            title={t("home.featured")}
            lead={t("home.featuredLead")}
            action={{
              href: `/${country.slug}/${country.regions[0].slug}`,
              label: t("common.seeAll"),
            }}
          />
          <div className="stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((r, i) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                countrySlug={country.slug}
                regionSlug={r.regions?.slug ?? country.regions[0].slug}
                priority={i === 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <SectionHeading
          eyebrow={t("home.howItWorksEyebrow")}
          hue="mint"
          title={t("home.howItWorks")}
          lead={t("home.howItWorksLead")}
        />
        <div className="mt-6">
          <HowItWorks
            steps={[
              { title: t("home.step1Title"), body: t("home.step1Body") },
              { title: t("home.step2Title"), body: t("home.step2Body") },
              { title: t("home.step3Title"), body: t("home.step3Body") },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="mesh-aurora relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-12">
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-grape uppercase">
              {t("home.ownerCtaEyebrow")}
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
              {t("home.ownerCtaTitle")}
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              {t("home.ownerCtaBody")}
            </p>
            <Button asChild variant="brand" size="lg" className="mt-6">
              <Link href="/for-restaurants">
                {t("footer.forRestaurants")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
