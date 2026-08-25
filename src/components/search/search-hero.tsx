"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { formatInTimeZone } from "date-fns-tz";
import {
  BadgeCheck,
  CreditCard,
  MapPin,
  Search,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import heroMeta from "../../../public/images/hero-meta.json";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SearchHeroPlace = {
  regionSlug: string;
  regionLabel: string;
  areas: { slug: string; label: string }[];
};

export type SearchHeroCuisine = { slug: string; label: string; emoji: string };

const ANY = "__any__";

export function SearchHero({
  countrySlug,
  countryName,
  timezone,
  places,
  cuisineOptions,
}: {
  countrySlug: string;
  countryName: string;
  timezone: string;
  places: SearchHeroPlace[];
  cuisineOptions: SearchHeroCuisine[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [where, setWhere] = useState<string>("");
  const [cuisine, setCuisine] = useState<string>("");

  // "Today" in the country's time zone — a UTC date would let late-night
  // visitors pick a date the restaurants have already finished serving.
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  function submit(extra?: Record<string, string>) {
    const [regionSlug, areaSlug] = where
      ? where.split("/")
      : [places[0]?.regionSlug];
    if (!regionSlug) return;
    const query = new URLSearchParams();
    if (areaSlug) query.set("area", areaSlug);
    if (cuisine) query.set("cuisine", cuisine);
    for (const [k, v] of Object.entries(extra ?? {})) query.set(k, v);
    const qs = query.toString();
    router.push(`/${countrySlug}/${regionSlug}${qs ? `?${qs}` : ""}`);
  }

  return (
    <section
      className={
        // Phone: edge to edge and full-height, so the beach fills the screen
        // under the header (svh, not vh — vh jumps when mobile browser chrome
        // hides and would push the search bar off-screen mid-scroll).
        "relative -mx-4 flex min-h-[calc(100svh-4rem)] flex-col justify-end overflow-hidden " +
        // Tablet and up: back to a contained, rounded hero card.
        "sm:-mx-6 sm:mt-4 sm:block sm:min-h-0 sm:rounded-[2rem]"
      }
    >
      {/* Fig Tree Bay, Protaras — CC BY 2.0, see public/images/CREDITS.txt.
          Decorative: the heading carries the meaning. */}
      <Image
        src={`${heroMeta.base}-1920.webp`}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        placeholder="blur"
        blurDataURL={heroMeta.blurDataURL}
      />
      {/* Brand-hue colour grade, then a scrim for text contrast. Fixed rgb()
          on purpose — this sits over a photo and must not flip with the theme.
          Normal blending (not soft-light) so the turquoise water stays
          turquoise instead of washing out to pastel. */}
      <div
        className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,86,54,0.30)_0%,rgba(255,45,132,0.14)_45%,rgba(124,77,255,0.32)_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,8,14,0.86)_0%,rgba(6,8,14,0.34)_52%,rgba(6,8,14,0.04)_100%)]"
        aria-hidden
      />

      <div className="relative px-5 pt-28 pb-8 sm:px-10 sm:pt-36 sm:pb-10">
        <h1 className="max-w-4xl font-display text-[2.75rem] leading-[0.95] font-extrabold text-balance text-white sm:text-6xl lg:text-7xl">
          {t.rich("home.heroTitle", {
            country: countryName,
            accent: (chunks) => (
              <span className="bg-[linear-gradient(105deg,#FFD166_0%,#FF8A5B_50%,#FF6FA5_100%)] bg-clip-text pb-[0.06em] text-transparent">
                {chunks}
              </span>
            ),
          })}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-pretty text-white/85">
          {t("home.heroSubtitle")}
        </p>

        {/* Trust strip — plain promises, nothing invented */}
        <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/80">
          <Promise icon={BadgeCheck} label={t("home.trustInstant")} />
          <Promise icon={Sparkles} label={t("home.trustFree")} />
          <Promise icon={CreditCard} label={t("home.trustNoCard")} />
        </ul>

        {/* Search bar — one solid card split into two segments: where, then
            what you feel like eating. Date and party size are chosen on the
            restaurant page itself, where live slots are shown. */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-card shadow-float sm:rounded-[1.25rem]">
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            <Segment
              icon={MapPin}
              iconClass="text-coral"
              label={t("home.where")}
              htmlFor="search-where"
            >
              <Select value={where} onValueChange={setWhere}>
                <SelectTrigger
                  id="search-where"
                  className="h-auto w-full border-0 bg-transparent p-0 text-base font-semibold shadow-none focus-visible:ring-0 data-[placeholder]:font-normal data-[placeholder]:text-muted-foreground"
                >
                  <SelectValue
                    placeholder={t("home.anywhere", { country: countryName })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {places.map((p) => (
                    <SelectGroup key={p.regionSlug}>
                      <SelectLabel>{p.regionLabel}</SelectLabel>
                      <SelectItem value={p.regionSlug}>
                        {p.regionLabel}
                      </SelectItem>
                      {p.areas.map((a) => (
                        <SelectItem
                          key={a.slug}
                          value={`${p.regionSlug}/${a.slug}`}
                        >
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Segment>

            <Divider />

            <Segment
              icon={UtensilsCrossed}
              iconClass="text-grape"
              label={t("search.cuisine")}
              htmlFor="search-cuisine"
            >
              <Select
                value={cuisine || ANY}
                onValueChange={(v) => setCuisine(v === ANY ? "" : v)}
              >
                <SelectTrigger
                  id="search-cuisine"
                  className="h-auto w-full border-0 bg-transparent p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>{t("home.anyCuisine")}</SelectItem>
                  {cuisineOptions.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      <span className="mr-1.5" aria-hidden>
                        {c.emoji}
                      </span>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Segment>

            <div className="p-2 sm:flex sm:items-center sm:pl-0">
              <Button
                variant="brand"
                size="lg"
                className="h-12 w-full sm:h-[3.75rem] sm:w-auto sm:px-8"
                onClick={() => submit()}
              >
                <Search data-icon="inline-start" />
                {t("home.findTable")}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick jumps — tonight, then the country's regions */}
        <div className="scroll-x mt-5 flex gap-2 pb-1">
          <button
            type="button"
            onClick={() => submit({ date: today, party: "2" })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:ring-[3px] focus-visible:ring-white/50 focus-visible:outline-none"
          >
            <Sparkles className="size-4" aria-hidden />
            {t("home.tonight")}
          </button>
          {places.map((p) => (
            <Link
              key={p.regionSlug}
              href={`/${countrySlug}/${p.regionSlug}`}
              className="inline-flex shrink-0 items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:ring-[3px] focus-visible:ring-white/50 focus-visible:outline-none"
            >
              {p.regionLabel}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Promise({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <Icon className="size-4 text-white/70" aria-hidden />
      {label}
    </li>
  );
}

function Segment({
  icon: Icon,
  iconClass,
  label,
  htmlFor,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconClass: string;
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
      <Icon className={`size-5 shrink-0 ${iconClass}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <Label
          className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          {...(htmlFor ? { htmlFor } : {})}
        >
          {label}
        </Label>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <span
      className="mx-4 h-px bg-border sm:mx-0 sm:my-4 sm:h-auto sm:w-px"
      aria-hidden
    />
  );
}
