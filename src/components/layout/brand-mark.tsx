import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The logo lockup: a gradient squircle holding a fork-and-plate glyph, plus the
 * two-tone wordmark. Both halves come from `BRAND` so a rename is one edit.
 *
 * The gradient is inlined per-instance with a unique id — two lockups on the
 * same page (header + footer) would otherwise fight over one `<defs>` id.
 */
export function BrandMark({
  className,
  id = "brand",
}: {
  className?: string;
  id?: string;
}) {
  const gradientId = `${id}-gradient`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--coral)" />
          <stop offset="0.5" stopColor="var(--pink)" />
          <stop offset="1" stopColor="var(--grape)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 14v11" />
        <path d="M28.5 14v11" />
        <path d="M14.5 14v11a5.5 5.5 0 0 0 5.5 5.5h4a5.5 5.5 0 0 0 5.5-5.5" />
        <path d="M21.5 30.5V50" />
        <path d="M43 14c5 0 8 4.6 8 10s-3 9-8 9-8-3.6-8-9 3-10 8-10Z" />
        <path d="M43 33v17" />
      </g>
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-xl leading-none font-extrabold tracking-tight",
        className,
      )}
    >
      <span className="text-gradient-brand">{BRAND.wordmark.head}</span>
      <span className="text-foreground">{BRAND.wordmark.tail}</span>
    </span>
  );
}

export function BrandLockup({
  className,
  markId,
}: {
  className?: string;
  markId?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark id={markId} className="size-8 shrink-0 rounded-[0.6rem]" />
      <BrandWordmark />
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
