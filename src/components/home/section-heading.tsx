import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EYEBROW_HUES = {
  coral: "text-coral",
  sea: "text-sea",
  grape: "text-grape",
  mint: "text-mint",
  pink: "text-pink",
  sun: "text-[#a06a00] dark:text-sun",
} as const;

/**
 * The shared rhythm for every home-page section: a hue-tinted eyebrow, a
 * display heading, an optional lead, and an optional link on the right.
 */
export function SectionHeading({
  eyebrow,
  hue = "coral",
  title,
  lead,
  action,
}: {
  eyebrow: string;
  hue?: keyof typeof EYEBROW_HUES;
  title: string;
  lead?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <p
          className={cn(
            "text-xs font-semibold tracking-[0.18em] uppercase",
            EYEBROW_HUES[hue],
          )}
        >
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
          {title}
        </h2>
        {lead ? (
          <p className="mt-2 text-pretty text-muted-foreground">{lead}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-soft transition-colors hover:border-coral/40 hover:text-coral"
        >
          {action.label}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : null}
    </div>
  );
}
