import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import {
  cuisines,
  defaultCountry,
  localized,
  localizedLocative,
} from "@/lib/data/config";
import { BrandLockup } from "./brand-mark";

// The categories worth surfacing for SEO and for a hungry visitor scrolling
// to the bottom. Slugs must exist in src/config/cuisines.json.
const FOOTER_CUISINES = [
  "seafood",
  "cypriot-meze",
  "taverna",
  "grill-souvlaki",
  "greek",
  "mediterranean",
];

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const country = defaultCountry;

  return (
    <footer className="mt-20 border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandLockup markId="footer" />
            <p className="mt-3 max-w-xs text-sm text-pretty text-muted-foreground">
              {t("footer.tagline", {
                country: localizedLocative(country, locale),
              })}
            </p>
            <div
              className="mt-5 h-1 w-24 rounded-full bg-gradient-brand"
              aria-hidden
            />
          </div>

          <FooterColumn title={t("nav.regions")}>
            {country.regions.map((region) => (
              <FooterLink
                key={region.slug}
                href={`/${country.slug}/${region.slug}`}
              >
                {localized(region.name, locale)}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t("nav.cuisines")}>
            {FOOTER_CUISINES.map((slug) => {
              const cuisine = cuisines.find((c) => c.slug === slug);
              if (!cuisine) return null;
              return (
                <FooterLink
                  key={slug}
                  href={`/${country.slug}/cuisine/${slug}`}
                >
                  {localized(cuisine.name, locale)}
                </FooterLink>
              );
            })}
          </FooterColumn>

          <FooterColumn title={t("footer.product")}>
            <FooterLink href="/for-restaurants">
              {t("footer.forRestaurants")}
            </FooterLink>
            <FooterLink href="/dashboard">{t("nav.dashboard")}</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            {t("footer.rights", {
              year: new Date().getFullYear(),
              brand: BRAND.name,
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </h2>
      <ul className="mt-3 grid gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-muted-foreground transition-colors hover:text-coral"
      >
        {children}
      </Link>
    </li>
  );
}
