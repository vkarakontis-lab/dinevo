import { formatInTimeZone } from "date-fns-tz";

export type Hours = { weekday: number; opens: string; closes: string };

export type OpenState = {
  /** ISO weekday in the restaurant's zone (Mon = 1). */
  todayIso: number;
  /** "HH:mm" in the restaurant's zone. */
  nowHm: string;
  openNow: boolean;
  /** Next opening time today, "HH:mm", if the place is currently shut. */
  nextOpening?: string;
};

const hm = (v: string) => v.slice(0, 5);

/**
 * Is `now` inside this span? `closes <= opens` means the span runs past
 * midnight (a taverna open 19:00–01:00), so the comparison flips.
 */
function isOpenIn(h: Hours, nowHm: string) {
  const opens = hm(h.opens);
  const closes = hm(h.closes);
  return closes <= opens
    ? nowHm >= opens || nowHm < closes
    : nowHm >= opens && nowHm < closes;
}

/**
 * Open/closed computed in the RESTAURANT's time zone, not the visitor's — a
 * tourist browsing from London must still see Cyprus opening hours.
 *
 * Shared by HoursBlock and the header pill so the two can never disagree.
 */
export function computeOpenState(hours: Hours[], timezone: string): OpenState {
  const now = new Date();
  const todayIso = Number(formatInTimeZone(now, timezone, "i"));
  const nowHm = formatInTimeZone(now, timezone, "HH:mm");

  const spans = (d: number) => hours.filter((h) => h.weekday === d);

  // Yesterday's past-midnight span can still be running right now.
  const yesterday = todayIso === 1 ? 7 : todayIso - 1;
  const openNow =
    spans(todayIso).some((h) => isOpenIn(h, nowHm)) ||
    spans(yesterday).some(
      (h) => hm(h.closes) <= hm(h.opens) && nowHm < hm(h.closes),
    );

  const nextOpening = spans(todayIso)
    .map((h) => hm(h.opens))
    .filter((o) => o > nowHm)
    .sort()[0];

  return { todayIso, nowHm, openNow, nextOpening };
}

export function spansFor(hours: Hours[], weekday: number) {
  return hours.filter((h) => h.weekday === weekday);
}

export { hm };
