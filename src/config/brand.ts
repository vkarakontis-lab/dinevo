/**
 * Single source of truth for the brand.
 *
 * Renaming the product = change `name` (and optionally `wordmark`) here.
 * Nothing else hardcodes it: components read `BRAND.name`, and every message
 * string that mentions the brand takes it as a `{brand}` placeholder.
 */
export const BRAND = {
  /** Product name, shown in the header, footer, emails and page titles. */
  name: "Dinevo",
  /**
   * How the wordmark is split for the two-tone logo lockup.
   * `head` renders in the gradient, `tail` in ink. Keep `head + tail === name`.
   */
  wordmark: { head: "Dine", tail: "vo" },
  /** Used for the email "from" display name and legal lines. */
  legalName: "Dinevo",
  /** Bare domain, no protocol — footer + email footers. */
  domain: "dinevo.com",
} as const;

export type Brand = typeof BRAND;
