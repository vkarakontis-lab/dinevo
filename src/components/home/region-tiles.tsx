import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type RegionTile = {
  slug: string;
  label: string;
  /** A few area names, already localized — the reason to tap this region. */
  areas: string[];
};

// One hue per region, rotated by index so the grid reads as a set rather than
// a rainbow. Deterministic: SSR and client always pick the same class.
const TILE_STYLES = [
  "bg-[linear-gradient(140deg,var(--coral)_0%,var(--pink)_100%)]",
  "bg-[linear-gradient(140deg,var(--sea)_0%,var(--mint)_100%)]",
  "bg-[linear-gradient(140deg,var(--grape)_0%,var(--pink)_100%)]",
  "bg-[linear-gradient(140deg,var(--sun)_0%,var(--coral)_100%)]",
  "bg-[linear-gradient(140deg,var(--mint)_0%,var(--sea)_100%)]",
  "bg-[linear-gradient(140deg,var(--pink)_0%,var(--grape)_100%)]",
] as const;

/**
 * The primary wayfinding surface on the home page: the country's regions as
 * big gradient tiles. The first tile spans two columns so the grid isn't a
 * monotonous row of equal boxes — with five regions in a three-column grid
 * that also fills both rows exactly, leaving no dead cell.
 */
export function RegionTiles({
  countrySlug,
  regions,
}: {
  countrySlug: string;
  regions: RegionTile[];
}) {
  return (
    <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {regions.map((region, i) => (
        <li key={region.slug} className={cn(i === 0 && "sm:col-span-2")}>
          <Link
            href={`/${countrySlug}/${region.slug}`}
            className={cn(
              "lift group relative flex h-full min-h-36 flex-col justify-end overflow-hidden rounded-3xl p-5 text-white shadow-soft focus-visible:ring-[3px] focus-visible:ring-coral/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              i === 0 && "sm:min-h-48 lg:p-7",
              TILE_STYLES[i % TILE_STYLES.length],
            )}
          >
            {/* Depth: a soft light bloom top-left, a dark foot for text contrast */}
            <span
              className="absolute inset-0 bg-[radial-gradient(70%_60%_at_15%_0%,rgba(255,255,255,0.34)_0%,transparent_70%)]"
              aria-hidden
            />
            <span
              className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,rgba(8,9,14,0.42)_0%,transparent_100%)]"
              aria-hidden
            />

            <MapPin
              className="absolute top-5 left-5 size-5 text-white/70 transition-transform duration-300 group-hover:-translate-y-0.5"
              aria-hidden
            />
            <ArrowRight
              className="absolute top-5 right-5 size-5 text-white/70 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />

            <span className="relative">
              <span
                className={cn(
                  "block font-display leading-tight font-extrabold tracking-tight text-balance",
                  i === 0 ? "text-3xl lg:text-4xl" : "text-2xl",
                )}
              >
                {region.label}
              </span>
              {region.areas.length > 0 ? (
                <span className="mt-1.5 block text-sm text-white/80">
                  {region.areas.join(" · ")}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
