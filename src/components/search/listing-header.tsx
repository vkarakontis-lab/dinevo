import { ChevronRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };
export type AreaPill = { slug: string; label: string; href: string };

/**
 * The top of every listing page: breadcrumb trail, display heading, and — when
 * the region has areas — a scrollable row of pills to hop between them.
 *
 * The crumbs are also emitted as BreadcrumbList JSON-LD by the caller; this
 * component only renders the visible trail.
 */
export function ListingHeader({
  crumbs,
  crumbLabel,
  title,
  areas,
  activeAreaSlug,
  allAreasHref,
  allAreasLabel,
}: {
  crumbs: Crumb[];
  crumbLabel: string;
  title: string;
  areas?: AreaPill[];
  activeAreaSlug?: string;
  allAreasHref?: string;
  allAreasLabel: string;
}) {
  return (
    <div className="pt-6 sm:pt-8">
      <nav aria-label={crumbLabel}>
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="size-3.5 shrink-0" aria-hidden />
              ) : null}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-coral"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold text-balance sm:text-4xl lg:text-5xl">
        {title}
      </h1>

      {areas && areas.length > 0 ? (
        <div className="scroll-x mt-5 flex gap-2 pb-1">
          {allAreasHref ? (
            <AreaChip
              href={allAreasHref}
              label={allAreasLabel}
              active={!activeAreaSlug}
              icon
            />
          ) : null}
          {areas.map((area) => (
            <AreaChip
              key={area.slug}
              href={area.href}
              label={area.label}
              active={area.slug === activeAreaSlug}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AreaChip({
  href,
  label,
  active,
  icon = false,
}: {
  href: string;
  label: string;
  active: boolean;
  icon?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-transparent bg-coral text-coral-foreground"
          : "border-border bg-card text-foreground hover:border-coral/45 hover:text-coral",
      )}
    >
      {icon ? <MapPin className="size-4" aria-hidden /> : null}
      {label}
    </Link>
  );
}
