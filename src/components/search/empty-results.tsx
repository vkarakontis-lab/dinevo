import { SearchX } from "lucide-react";

/**
 * Shown when filters (or a genuinely empty area) return nothing. A bare
 * sentence in a box reads like a bug; this reads like a dead end with a way out.
 * `action` is rendered by the caller so it can be a client "clear filters"
 * button or a plain link.
 */
export function EmptyResults({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-border bg-card px-6 py-14 text-center shadow-soft">
      <span className="relative flex size-20 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-15 blur-xl" />
        <span className="relative flex size-16 items-center justify-center rounded-full bg-coral-soft text-coral">
          <SearchX className="size-7" />
        </span>
      </span>
      <p className="mt-5 max-w-md font-display text-xl font-bold text-balance">
        {title}
      </p>
      {hint ? (
        <p className="mt-1.5 max-w-sm text-pretty text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
