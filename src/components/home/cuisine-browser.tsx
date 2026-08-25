"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CuisineCard = {
  slug: string;
  label: string;
  emoji: string;
  image: string;
  blurDataURL?: string;
};

export type CuisinePill = {
  slug: string;
  label: string;
  emoji: string;
};

// Top categories as photo cards, the rest as emoji pills: one scrollable
// row on mobile until "View all" expands the full wrapped list.
export function CuisineBrowser({
  countrySlug,
  cards,
  pills,
}: {
  countrySlug: string;
  cards: CuisineCard[];
  pills: CuisinePill[];
}) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const visiblePills = expanded ? pills : pills.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Photo cards — the categories people actually come for */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {cards.map((card, i) => (
          <Link
            key={card.slug}
            href={`/${countrySlug}/cuisine/${card.slug}`}
            className="group relative aspect-square overflow-hidden rounded-2xl shadow-soft transition-shadow hover:shadow-lift"
          >
            <Image
              src={card.image}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 16vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority={i < 3}
              placeholder={card.blurDataURL ? "blur" : "empty"}
              blurDataURL={card.blurDataURL}
            />
            <span
              className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,8,14,0.88)_0%,rgba(6,8,14,0.30)_55%,rgba(6,8,14,0.05)_100%)]"
              aria-hidden
            />
            <span
              className="glass-dark absolute top-2 left-2 flex size-8 items-center justify-center rounded-full text-base sm:size-9 sm:text-lg"
              aria-hidden
            >
              {card.emoji}
            </span>
            <span className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3.5">
              <span className="block font-display text-xs leading-tight font-bold text-white sm:text-sm">
                {card.label}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* The rest — emoji pills, scrollable row until expanded */}
      <div
        className={cn(
          "flex gap-2",
          expanded ? "flex-wrap" : "scroll-x pb-1",
        )}
      >
        {visiblePills.map((pill, i) => (
          <Link
            key={pill.slug}
            href={`/${countrySlug}/cuisine/${pill.slug}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
              // The full categorical palette, rotated by index — deterministic
              // so the server and the client agree on every pill's colour.
              [
                "border-coral/30 bg-coral-soft text-coral hover:bg-coral/15",
                "border-sea/30 bg-sea-soft text-sea hover:bg-sea/15",
                "border-grape/30 bg-grape-soft text-grape hover:bg-grape/15",
                "border-sun/40 bg-sun-soft text-[#7a5200] hover:bg-sun/20 dark:text-sun",
                "border-mint/30 bg-mint-soft text-mint hover:bg-mint/15",
                "border-pink/30 bg-pink-soft text-pink hover:bg-pink/15",
              ][i % 6],
            )}
          >
            <span aria-hidden>{pill.emoji}</span>
            {pill.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:border-coral/40 hover:text-coral"
        >
          {t("common.viewAll")}
          {expanded ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
