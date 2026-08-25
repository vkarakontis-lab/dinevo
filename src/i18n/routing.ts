import { defineRouting } from "next-intl/routing";
import countriesConfig from "@/config/countries.json";

// Union of locales across all active countries — adding a country/locale is
// config, not code (see src/config/countries.json).
const locales = [
  ...new Set(
    countriesConfig.countries
      .filter((c) => c.is_active)
      .flatMap((c) => c.locales),
  ),
];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
