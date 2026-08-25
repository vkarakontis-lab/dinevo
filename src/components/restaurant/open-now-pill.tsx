"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { computeOpenState, type Hours } from "./opening-state";
import { cn } from "@/lib/utils";

/**
 * "Open now" / "Opens at 18:00" / "Closed" for the profile header.
 *
 * Client-side because the answer depends on the current time — rendering it on
 * the server would bake a stale answer into the ISR-cached HTML.
 */
export function OpenNowPill({
  hours,
  timezone,
  className,
}: {
  hours: Hours[];
  timezone: string;
  className?: string;
}) {
  const t = useTranslations();
  const state = useMemo(
    () => computeOpenState(hours, timezone),
    [hours, timezone],
  );

  if (hours.length === 0) return null;

  const label = state.openNow
    ? t("restaurant.openNow")
    : state.nextOpening
      ? t("restaurant.opensAt", { time: state.nextOpening })
      : t("restaurant.closedNow");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        state.openNow
          ? "bg-mint-soft text-mint dark:bg-mint/15"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {/* Dot is decorative — the label already says open or closed. */}
      <span
        className={cn(
          "size-1.5 rounded-full",
          state.openNow ? "bg-mint" : "bg-muted-foreground/60",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
