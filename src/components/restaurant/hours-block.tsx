"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Hours = { weekday: number; opens: string; closes: string };

const DAY_KEYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS_EL = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];

// "Open now / Closed now / Opens at" computed in the RESTAURANT's time zone.
// closes <= opens means service runs past midnight.
export function HoursBlock({
  hours,
  timezone,
}: {
  hours: Hours[];
  timezone: string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const { todayIso, nowHm } = useMemo(() => {
    const now = new Date();
    return {
      todayIso: Number(formatInTimeZone(now, timezone, "i")),
      nowHm: formatInTimeZone(now, timezone, "HH:mm"),
    };
  }, [timezone]);

  if (hours.length === 0) return null;

  const hm = (v: string) => v.slice(0, 5);
  const spans = (d: number) => hours.filter((h) => h.weekday === d);
  const isOpenIn = (h: Hours) => {
    const opens = hm(h.opens);
    const closes = hm(h.closes);
    return closes <= opens
      ? nowHm >= opens || nowHm < closes // past midnight
      : nowHm >= opens && nowHm < closes;
  };

  // Open now? Check today's spans, plus yesterday's past-midnight span.
  const yesterday = todayIso === 1 ? 7 : todayIso - 1;
  const openNow =
    spans(todayIso).some(isOpenIn) ||
    spans(yesterday).some(
      (h) => hm(h.closes) <= hm(h.opens) && nowHm < hm(h.closes),
    );
  const nextOpening = spans(todayIso)
    .map((h) => hm(h.opens))
    .filter((o) => o > nowHm)
    .sort()[0];

  const dayNames = locale === "el" ? DAY_KEYS_EL : DAY_KEYS_EN;
  const order = Array.from({ length: 7 }, (_, i) => ((todayIso - 1 + i) % 7) + 1);

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-xl font-semibold">
          {t("restaurant.openingHours")}
        </h2>
        <Badge
          className={cn(
            openNow
              ? "bg-olive text-olive-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {openNow
            ? t("restaurant.openNow")
            : nextOpening
              ? t("restaurant.opensAt", { time: nextOpening })
              : t("restaurant.closedNow")}
        </Badge>
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        {order.map((d, i) => {
          const daySpans = spans(d);
          return (
            <div
              key={d}
              className={cn(
                "flex justify-between gap-4 rounded px-2 py-1",
                i === 0 && "bg-secondary font-medium",
              )}
            >
              <dt>{dayNames[d - 1]}</dt>
              <dd className="text-right">
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
