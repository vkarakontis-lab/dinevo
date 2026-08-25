"use client";

import { useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export type FilterOption = { slug: string; label: string };

// Every control is a pill: hairline when idle, filled coral when it's actually
// filtering something. One colour for "this is on" keeps the row readable.
const PILL =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-coral/35";
const PILL_IDLE =
  "border-border bg-card text-foreground hover:border-coral/45 hover:text-coral";
const PILL_ACTIVE =
  "border-transparent bg-coral text-coral-foreground hover:bg-coral/90";

export function FilterBar({
  areas,
  cuisines,
  features,
  showAreaFilter = true,
}: {
  areas: FilterOption[];
  cuisines: FilterOption[];
  features: FilterOption[];
  showAreaFilter?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // A slug that isn't in the options (stale link, hand-edited URL) would
  // leave the Select rendering an empty, coral-filled pill — ignore it.
  const rawArea = searchParams.get("area") ?? "";
  const rawCuisine = searchParams.get("cuisine") ?? "";
  const area = areas.some((a) => a.slug === rawArea) ? rawArea : "";
  const cuisine = cuisines.some((c) => c.slug === rawCuisine) ? rawCuisine : "";
  const prices = (searchParams.get("price") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const activeFeatures = (searchParams.get("features") ?? "")
    .split(",")
    .filter(Boolean);
  const hasFilters =
    !!area || !!cuisine || prices.length > 0 || activeFeatures.length > 0;

  function togglePrice(band: number) {
    const next = prices.includes(band)
      ? prices.filter((p) => p !== band)
      : [...prices, band].sort();
    setParams({ price: next.join(",") || null });
  }

  function toggleFeature(slug: string) {
    const next = activeFeatures.includes(slug)
      ? activeFeatures.filter((f) => f !== slug)
      : [...activeFeatures, slug];
    setParams({ features: next.join(",") || null });
  }

  const areaLabel = areas.find((a) => a.slug === area)?.label;
  const cuisineLabel = cuisines.find((c) => c.slug === cuisine)?.label;

  return (
    <div>
      <div className="scroll-x flex items-center gap-2 pb-1">
        {showAreaFilter ? (
          <Select
            value={area || ALL}
            onValueChange={(v) => setParams({ area: v === ALL ? null : v })}
          >
            <SelectTrigger
              className={cn(PILL, area ? PILL_ACTIVE : PILL_IDLE, "shadow-none")}
            >
              <SelectValue placeholder={t("search.area")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("search.allAreas")}</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.slug} value={a.slug}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {cuisines.length > 0 ? (
          <Select
            value={cuisine || ALL}
            onValueChange={(v) => setParams({ cuisine: v === ALL ? null : v })}
          >
            <SelectTrigger
              className={cn(
                PILL,
                cuisine ? PILL_ACTIVE : PILL_IDLE,
                "shadow-none",
              )}
            >
              <SelectValue placeholder={t("search.cuisine")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("search.cuisine")}</SelectItem>
              {cuisines.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {/* Price is a segmented pill: each band toggles independently. */}
        <div
          className="inline-flex h-10 shrink-0 items-center overflow-hidden rounded-full border border-border bg-card"
          role="group"
          aria-label={t("search.price")}
        >
          {[1, 2, 3, 4].map((band) => (
            <button
              key={band}
              type="button"
              aria-pressed={prices.includes(band)}
              onClick={() => togglePrice(band)}
              className={cn(
                "h-full px-3.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-coral/35 focus-visible:ring-inset",
                prices.includes(band)
                  ? "bg-coral text-coral-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {"€".repeat(band)}
            </button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger
            className={cn(
              PILL,
              activeFeatures.length > 0 ? PILL_ACTIVE : PILL_IDLE,
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {t("search.features")}
            {activeFeatures.length > 0 ? (
              <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-coral-foreground/25 text-xs tabular-nums">
                {activeFeatures.length}
              </span>
            ) : null}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-[min(28rem,calc(100vw-2rem))] rounded-3xl border-border p-3 shadow-float"
          >
            <div className="flex max-h-80 flex-wrap gap-2 overflow-y-auto p-1">
              {features.map((f) => {
                const on = activeFeatures.includes(f.slug);
                return (
                  <button
                    key={f.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleFeature(f.slug)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-coral/35",
                      on
                        ? "border-transparent bg-coral text-coral-foreground"
                        : "border-border bg-card hover:border-coral/45 hover:text-coral",
                    )}
                  >
                    {on ? <X className="size-3.5" aria-hidden /> : null}
                    {f.label}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters, each removable — so a stale filter is never invisible */}
      {hasFilters ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="sr-only">{t("search.activeFilters")}</span>
          {areaLabel ? (
            <FilterChip
              label={areaLabel}
              removeLabel={t("search.removeFilter", { label: areaLabel })}
              onRemove={() => setParams({ area: null })}
            />
          ) : null}
          {cuisineLabel ? (
            <FilterChip
              label={cuisineLabel}
              removeLabel={t("search.removeFilter", { label: cuisineLabel })}
              onRemove={() => setParams({ cuisine: null })}
            />
          ) : null}
          {prices.map((band) => {
            const label = "€".repeat(band);
            return (
              <FilterChip
                key={band}
                label={label}
                removeLabel={t("search.removeFilter", { label })}
                onRemove={() => togglePrice(band)}
              />
            );
          })}
          {activeFeatures.map((slug) => {
            const label = features.find((f) => f.slug === slug)?.label ?? slug;
            return (
              <FilterChip
                key={slug}
                label={label}
                removeLabel={t("search.removeFilter", { label })}
                onRemove={() => toggleFeature(slug)}
              />
            );
          })}
          <button
            type="button"
            onClick={() =>
              setParams({
                area: null,
                cuisine: null,
                price: null,
                features: null,
              })
            }
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-coral hover:underline"
          >
            {t("search.clearFilters")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  removeLabel,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <Badge variant="soft" className="gap-1 py-1.5 pr-1.5 pl-3">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="inline-flex size-5 items-center justify-center rounded-full transition-colors hover:bg-coral/25"
      >
        <X className="size-3" aria-hidden />
      </button>
    </Badge>
  );
}
