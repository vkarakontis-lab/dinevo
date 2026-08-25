import { routing } from "@/i18n/routing";

// hreflang alternates for a locale-less path ("" for home, "/cyprus/limassol").
// Every public page emits these; x-default points at English (tourists first).
export function localeAlternates(path: string, locale: string) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;
  languages["x-default"] = `/en${path}`;
  return {
    canonical: `/${locale}${path}`,
    languages,
  };
}
