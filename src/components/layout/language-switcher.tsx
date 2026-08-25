"use client";

import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Keeps the visitor on the same page — including query params (filters,
// booking prefill) — when switching language. useSearchParams lives behind
// its own Suspense boundary so static pages stay prerenderable.
function SwitcherInner() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  return (
    <nav
      aria-label={t("language")}
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5 text-sm"
    >
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={href}
          locale={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold uppercase transition-all",
            l === locale
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense fallback={<nav className="h-9 w-[5.5rem] rounded-full bg-muted/60" />}>
      <SwitcherInner />
    </Suspense>
  );
}
