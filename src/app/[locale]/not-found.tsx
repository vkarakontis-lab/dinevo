import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { defaultCountry } from "@/lib/data/config";

export default function NotFound() {
  const t = useTranslations();
  // Somewhere real to go next, read from config rather than hardcoded.
  const firstRegion = defaultCountry.regions[0];

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
      <span
        className="relative flex size-28 items-center justify-center"
        aria-hidden
      >
        <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-20 blur-2xl" />
        <span className="relative font-display text-5xl font-extrabold text-gradient-brand">
          404
        </span>
      </span>

      <h1 className="font-display text-3xl font-extrabold text-balance sm:text-4xl">
        {t("common.notFound")}
      </h1>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="brand" size="lg">
          <Link href="/">{t("nav.home")}</Link>
        </Button>
        {firstRegion ? (
          <Button asChild variant="outline" size="lg">
            <Link href={`/${defaultCountry.slug}/${firstRegion.slug}`}>
              {t("nav.explore")}
            </Link>
          </Button>
        ) : null}
      </div>
    </main>
  );
}
