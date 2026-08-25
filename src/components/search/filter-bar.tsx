"use client";

import { useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export type FilterOption = { slug: string; label: string };

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

  const area = searchParams.get("area") ?? "";
  const cuisine = searchParams.get("cuisine") ?? "";
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showAreaFilter ? (
        <Select
          value={area || ALL}
          onValueChange={(v) => setParams({ area: v === ALL ? null : v })}
        >
          <SelectTrigger className="h-9 w-auto min-w-32" size="sm">
            <SelectValue placeholder={t("search.area")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("search.area")}</SelectItem>
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
          <SelectTrigger className="h-9 w-auto min-w-32" size="sm">
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

      <div
        className="flex items-center overflow-hidden rounded-md border border-input"
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
              "px-2.5 py-1.5 text-sm transition-colors",
              prices.includes(band)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {"€".repeat(band)}
          </button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <SlidersHorizontal data-icon="inline-start" />
            {t("search.features")}
            {activeFeatures.length > 0 ? (
              <Badge className="ml-1 px-1.5">{activeFeatures.length}</Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="grid max-h-80 gap-2 overflow-y-auto">
          {features.map((f) => (
            <Label key={f.slug} className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={activeFeatures.includes(f.slug)}
                onCheckedChange={() => toggleFeature(f.slug)}
              />
              {f.label}
            </Label>
          ))}
        </PopoverContent>
      </Popover>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={() =>
            setParams({ area: null, cuisine: null, price: null, features: null })
          }
        >
          <X data-icon="inline-start" />
          {t("search.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
