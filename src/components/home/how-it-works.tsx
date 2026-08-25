import { CalendarCheck, Clock, Search } from "lucide-react";

export type HowStep = { title: string; body: string };

const STEP_STYLES = [
  {
    tile: "bg-coral-soft text-coral",
    numeral: "bg-[linear-gradient(140deg,var(--coral)_0%,var(--pink)_100%)]",
    icon: Search,
  },
  {
    tile: "bg-sea-soft text-sea",
    numeral: "bg-[linear-gradient(140deg,var(--sea)_0%,var(--grape)_100%)]",
    icon: Clock,
  },
  {
    tile: "bg-mint-soft text-mint",
    numeral: "bg-[linear-gradient(140deg,var(--mint)_0%,var(--sea)_100%)]",
    icon: CalendarCheck,
  },
] as const;

export function HowItWorks({ steps }: { steps: HowStep[] }) {
  return (
    <ol className="stagger grid gap-4 sm:grid-cols-3">
      {steps.slice(0, STEP_STYLES.length).map((step, i) => {
        const style = STEP_STYLES[i];
        const Icon = style.icon;
        return (
          <li
            key={step.title}
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft"
          >
            {/* The numeral is decorative — the ordered list already conveys order */}
            <span
              className={`pointer-events-none absolute -top-3 -right-1 bg-clip-text font-display text-[5.5rem] leading-none font-extrabold text-transparent opacity-15 ${style.numeral}`}
              aria-hidden
            >
              {i + 1}
            </span>
            <span
              className={`flex size-12 items-center justify-center rounded-2xl ${style.tile}`}
              aria-hidden
            >
              <Icon className="size-6" />
            </span>
            <h3 className="mt-4 font-display text-xl font-bold">{step.title}</h3>
            <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
              {step.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
