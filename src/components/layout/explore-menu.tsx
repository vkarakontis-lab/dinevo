"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ExploreRegion = { slug: string; label: string; areas: string };

const HUES = [
  "bg-coral-soft text-coral",
  "bg-sea-soft text-sea",
  "bg-grape-soft text-grape",
  "bg-sun-soft text-[#7a5200] dark:text-sun",
  "bg-mint-soft text-mint",
  "bg-pink-soft text-pink",
] as const;

export function ExploreMenu({
  label,
  heading,
  countrySlug,
  regions,
}: {
  label: string;
  heading: string;
  countrySlug: string;
  regions: ExploreRegion[];
}) {
  return (
    <Popover>
      <PopoverTrigger className="group inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-coral/40 data-[state=open]:bg-muted data-[state=open]:text-foreground">
        {label}
        <ChevronDown
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-3xl border-border p-3 shadow-float"
      >
        <p className="px-3 pt-1 pb-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {heading}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {regions.map((region, i) => (
            <li key={region.slug}>
              <Link
                href={`/${countrySlug}/${region.slug}`}
                className="flex items-start gap-3 rounded-2xl p-3 transition-colors hover:bg-muted"
              >
                <span
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${HUES[i % HUES.length]}`}
                >
                  <MapPin className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-base leading-tight font-bold">
                    {region.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {region.areas}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
