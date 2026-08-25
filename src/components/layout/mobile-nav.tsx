"use client";

import { useState } from "react";
import { ArrowRight, LayoutDashboard, MapPin, Menu, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BrandLockup } from "./brand-mark";
import { LanguageSwitcher } from "./language-switcher";
import type { ExploreRegion } from "./explore-menu";

const HUES = [
  "bg-coral-soft text-coral",
  "bg-sea-soft text-sea",
  "bg-grape-soft text-grape",
  "bg-sun-soft text-[#7a5200] dark:text-sun",
  "bg-mint-soft text-mint",
  "bg-pink-soft text-pink",
] as const;

export function MobileNav({
  countrySlug,
  regions,
  labels,
}: {
  countrySlug: string;
  regions: ExploreRegion[];
  labels: {
    menu: string;
    close: string;
    areas: string;
    forRestaurants: string;
    dashboard: string;
  };
}) {
  // Controlled so tapping any link closes the sheet — Next's client-side
  // navigation doesn't unmount it on its own.
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={labels.menu}
        className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-coral/40 md:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,90vw)] gap-0 p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle asChild>
            <span>
              <BrandLockup markId="mobile-nav" />
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <p className="px-1 pb-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {labels.areas}
          </p>
          <ul className="grid gap-1">
            {regions.map((region, i) => (
              <li key={region.slug}>
                <Link
                  href={`/${countrySlug}/${region.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-muted"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${HUES[i % HUES.length]}`}
                  >
                    <MapPin className="size-5" aria-hidden />
                  </span>
                  <span className="font-display text-base font-bold">
                    {region.label}
                  </span>
                  <ArrowRight
                    className="ml-auto size-4 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-1 border-t border-border pt-5">
            <Link
              href="/for-restaurants"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl p-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <Store className="size-5 text-muted-foreground" aria-hidden />
              {labels.forRestaurants}
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl p-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <LayoutDashboard
                className="size-5 text-muted-foreground"
                aria-hidden
              />
              {labels.dashboard}
            </Link>
          </div>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <LanguageSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  );
}
