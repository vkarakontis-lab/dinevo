import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One filled star plus the numeric value and review count — compact enough to
 * sit in a card overlay, and the number (not the colour) carries the meaning.
 * Pass the translated `restaurant.rating` sentence as `label`.
 */
export function RatingStars({
  rating,
  reviewCount,
  label,
  className,
}: {
  rating: number;
  reviewCount?: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      role="img"
      aria-label={label}
    >
      <Star
        className="size-4 shrink-0 text-sun"
        fill="currentColor"
        strokeWidth={0}
        aria-hidden
      />
      <span className="text-sm font-bold tabular-nums" aria-hidden>
        {clamped.toFixed(1)}
      </span>
      {typeof reviewCount === "number" && reviewCount > 0 ? (
        <span className="text-xs opacity-70 tabular-nums" aria-hidden>
          ({reviewCount})
        </span>
      ) : null}
    </span>
  );
}
