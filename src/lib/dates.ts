import { formatInTimeZone } from "date-fns-tz";
import { el } from "date-fns/locale";

// Times are ALWAYS rendered in the restaurant's time zone, 24h clock,
// with the day name in the reader's locale ("Σάββατο 5 Σεπτεμβρίου").
const dfnsLocale = (locale: string) => (locale === "el" ? el : undefined);

export function formatBookingDay(
  iso: string | Date,
  timezone: string,
  locale: string,
): string {
  return formatInTimeZone(iso, timezone, "EEEE d MMMM", {
    locale: dfnsLocale(locale),
  });
}

export function formatBookingTime(iso: string | Date, timezone: string): string {
  return formatInTimeZone(iso, timezone, "HH:mm");
}

export function formatLocalDate(iso: string | Date, timezone: string): string {
  return formatInTimeZone(iso, timezone, "yyyy-MM-dd");
}

export function shortDay(
  iso: string | Date,
  timezone: string,
  locale: string,
): string {
  return formatInTimeZone(iso, timezone, "EEE d MMM", {
    locale: dfnsLocale(locale),
  });
}
