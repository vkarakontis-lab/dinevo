import { cn } from "@/lib/utils";

/**
 * €€ indicator: `band` filled symbols, the rest hollow.
 *
 * Colour alone must never carry the meaning (a €€ and a €€€€ looked identical
 * to anyone who can't separate the two greys), so unfilled symbols are drawn
 * at lower opacity *and* at a lighter weight, and the whole thing carries an
 * `aria-label` with the spelled-out band.
 */
export function PriceBand({
  band,
  className,
  label,
}: {
  band: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-px text-sm", className)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={
            i <= band ? "font-bold" : "font-normal opacity-35"
          }
        >
          €
        </span>
      ))}
    </span>
  );
}
