import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { defaultCountry, localized } from "@/lib/data/config";
import { LanguageSwitcher } from "./language-switcher";
import { BrandLockup } from "./brand-mark";
import { HeaderShell } from "./header-shell";
import { MobileNav } from "./mobile-nav";
import { ExploreMenu } from "./explore-menu";

export async function SiteHeader() {
  const t = await getTranslations();
  const locale = await getLocale();

  // Wayfinding comes from config, never a hardcoded list of Cypriot cities.
  const regions = defaultCountry.regions.map((r) => ({
    slug: r.slug,
    label: localized(r.name, locale),
    areas: r.areas
      .slice(0, 4)
      .map((a) => localized(a.name, locale))
      .join(" · "),
  }));

  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-coral/40">
          <BrandLockup markId="header" />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <ExploreMenu
            label={t("nav.explore")}
            heading={t("nav.browseAreas")}
            countrySlug={defaultCountry.slug}
            regions={regions}
          />
          <Link
            href="/for-restaurants"
            className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("nav.forRestaurants")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <MobileNav
            countrySlug={defaultCountry.slug}
            regions={regions}
            labels={{
              menu: t("common.menu"),
              close: t("common.closeMenu"),
              areas: t("nav.browseAreas"),
              forRestaurants: t("nav.forRestaurants"),
              dashboard: t("nav.dashboard"),
            }}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
