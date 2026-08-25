"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { computeOpenState, hm, spansFor, type Hours } from "./opening-state";
import { OpenNowPill } from "./open-now-pill";
import { cn } from "@/lib/utils";

const DAY_KEYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS_EL = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];

/**
 * The week, rotated so today is first — that's the row people actually came
 * for. Open/closed state comes from the shared helper, computed in the
 * restaurant's own time zone.
 */
export function HoursBlock({
  hours,
  timezone,
}: {
  hours: Hours[];
  timezone: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { todayIso } = useMemo(
    () => computeOpenState(hours, timezone),
    [hours, timezone],
  );

  if (hours.length === 0) return null;

  const dayNames = locale === "el" ? DAY_KEYS_EL : DAY_KEYS_EN;
  const order = Array.from({ length: 7 }, (_, i) => ((todayIso - 1 + i) % 7) + 1);

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Clock className="size-5 text-muted-foreground" aria-hidden />
          {t("restaurant.openingHours")}
        </h2>
        <OpenNowPill hours={hours} timezone={timezone} />
      </div>

      <dl className="mt-4 text-sm">
        {order.map((d, i) => {
          const daySpans = spansFor(hours, d);
          const isToday = i === 0;
          return (
            <div
              key={d}
              className={cn(
                "flex items-baseline justify-between gap-4 rounded-xl px-3 py-2",
                isToday
                  ? "bg-muted font-bold"
                  : "text-muted-foreground",
              )}
            >
              <dt>
                {dayNames[d - 1]}
                {isToday ? (
                  <span className="ml-2 text-xs font-semibold text-coral">
                    {t("common.today")}
                  </span>
                ) : null}
              </dt>
              <dd className="text-right tabular-nums">
                {daySpans.length === 0
                  ? t("restaurant.closed")
                  : daySpans
                      .map((h) => `${hm(h.opens)}–${hm(h.closes)}`)
                      .join(", ")}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
