import { createTranslator } from "next-intl";
import en from "../../../messages/en.json";
import elMessages from "../../../messages/el.json";

const messages = { en, el: elMessages } as const;

export type EmailLocale = keyof typeof messages;

export const emailLocale = (locale: string | null | undefined): EmailLocale =>
  locale === "el" ? "el" : "en";

// Emails render outside a request context (server actions AND cron), so we
// build a translator from the message files directly instead of using
// next-intl's request-bound getTranslations.
export function emailTranslator(locale: string | null | undefined) {
  const l = emailLocale(locale);
  return createTranslator({ locale: l, messages: messages[l] });
}
