"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { Loader2, Minus, Phone, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fetchAvailability, createBooking } from "@/lib/booking/actions";
import type { BookingErrorCode } from "@/lib/booking/errors";
import type { AvailabilitySlot } from "@/lib/supabase/database.types";
import { shortDay, weekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type BookingWidgetRestaurant = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  minParty: number;
  maxParty: number;
  maxAdvanceDays: number;
  phone: string | null;
  whatsapp: string | null;
  bookingMode: string;
};

type Props = {
  restaurant: BookingWidgetRestaurant;
  initial?: { date?: string; party?: number; time?: string };
};

const REASON_TO_ERROR: Record<string, BookingErrorCode> = {
  party_size: "party_size_out_of_range",
  too_soon: "too_soon",
  too_far_ahead: "too_far_ahead",
  closed: "closed",
  slot_full: "slot_full",
  no_table: "no_availability",
};

// --- Cloudflare Turnstile (rendered only when the site key is configured;
// the server action refuses tokenless submissions when the secret is set) ---
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void },
      ) => string;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current || renderedRef.current) return;
    const render = () => {
      if (renderedRef.current || !ref.current || !window.turnstile) return;
      renderedRef.current = true;
      window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onToken,
      });
    };
    if (window.turnstile) {
      render();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile]",
    );
    if (existing) {
      existing.addEventListener("load", render);
      return () => existing.removeEventListener("load", render);
    }
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.dataset.turnstile = "true";
    script.addEventListener("load", render);
    document.head.appendChild(script);
  }, [onToken]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="min-h-16" />;
}

function WidgetBody({ restaurant, initial }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  // "Today" in the restaurant's time zone, not the visitor's.
  const todayLocal = formatInTimeZone(new Date(), restaurant.timezone, "yyyy-MM-dd");
  const [party, setPartyState] = useState(() => {
    const p = initial?.party && initial.party >= 1 ? initial.party : 2;
    return Math.max(restaurant.minParty, p);
  });
  const [date, setDateState] = useState(initial?.date ?? todayLocal);
  // null = loading; the fetch effect only sets state from async callbacks.
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [nextDay, setNextDay] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(initial?.time ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<BookingErrorCode | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLFormElement>(null);

  const tooMany = party > restaurant.maxParty;
  const loading = slots === null && !tooMany;

  useEffect(() => {
    if (tooMany) return;
    let cancelled = false;
    fetchAvailability(restaurant.id, date, party).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setSlots([]);
        setNextDay(null);
        setFetchFailed(true);
      } else {
        setSlots(res.slots);
        setNextDay(res.nextAvailableDay);
        setFetchFailed(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [restaurant.id, date, party, tooMany, reloadKey]);

  const setDate = useCallback((d: string) => {
    setDateState(d);
    setSlots(null);
    setErrorCode(null);
  }, []);

  const setParty = useCallback((updater: (p: number) => number) => {
    setPartyState((p) => updater(p));
    setSlots(null);
    setErrorCode(null);
  }, []);

  const reloadSlots = useCallback(() => {
    setSlots(null);
    setReloadKey((k) => k + 1);
  }, []);

  // A selected time that's no longer offered/available is derived away —
  // no state to clean up when fresh slots arrive.
  const effectiveSelected =
    selected &&
    slots?.some((s) => s.slot_local.slice(0, 5) === selected && s.available)
      ? selected
      : null;

  // Date chips: up to two weeks, never past the restaurant's booking horizon.
  const days = useMemo(() => {
    const span = Math.min(14, restaurant.maxAdvanceDays + 1);
    const base = new Date(`${todayLocal}T12:00:00Z`);
    return Array.from({ length: span }, (_, i) => {
      const d = addDays(base, i);
      return d.toISOString().slice(0, 10);
    });
  }, [todayLocal, restaurant.maxAdvanceDays]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; slots: AvailabilitySlot[] }>();
    for (const s of slots ?? []) {
      const label =
        (s.service_name as Record<string, string> | null)?.[locale] ??
        (s.service_name as Record<string, string> | null)?.en ??
        "";
      const entry = map.get(s.service_period_id) ?? { name: label, slots: [] };
      entry.slots.push(s);
      map.set(s.service_period_id, entry);
    }
    return [...map.values()];
  }, [slots, locale]);

  const anyAvailable = (slots ?? []).some((s) => s.available);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveSelected || submitting) return;
    // Mirror the server's email rule — browsers accept "a@a", the server
    // doesn't; catch it here with a precise message instead of a round-trip.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setErrorCode("invalid_email");
      return;
    }
    setSubmitting(true);
    setErrorCode(null);
    let res: Awaited<ReturnType<typeof createBooking>>;
    try {
      res = await createBooking({
        restaurantId: restaurant.id,
        date,
        time: effectiveSelected,
        party,
        name,
        email,
        phone: "",
        requests: "",
        locale,
        website: honeypotRef.current?.value ?? "",
        turnstileToken: turnstileToken ?? undefined,
      });
    } catch {
      // e.g. the site was redeployed while this page was open — the old
      // action id no longer exists. Show a retriable error, not a crash.
      setSubmitting(false);
      setErrorCode("generic");
      return;
    }
    if (res.ok) {
      router.push(`/booking/${res.manageToken}?new=1`);
      return;
    }
    setSubmitting(false);
    setErrorCode(res.code);
    if (res.code === "no_availability" || res.code === "slot_full") {
      // The slot was just taken — show fresh slots. The error stays visible
      // below the slot grid even after the form unmounts.
      setSelected(null);
      reloadSlots();
    }
  }

  const dayLabel = (d: string, i: number) =>
    i === 0
      ? t("common.today")
      : i === 1
        ? t("common.tomorrow")
        : weekdayShort(`${d}T12:00:00Z`, restaurant.timezone, locale);

  return (
    <div className="space-y-5">
      {/* Party stepper */}
      <div>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("restaurant.chooseGuests")}
        </span>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("home.fewerGuests")}
            onClick={() =>
              setParty((p) => Math.max(restaurant.minParty, p - 1))
            }
          >
            <Minus />
          </Button>
          <span
            className="min-w-24 text-center font-display text-base font-extrabold"
            aria-live="polite"
          >
            {t("common.guests", { count: party })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("home.moreGuests")}
            onClick={() =>
              setParty((p) => Math.min(restaurant.maxParty + 1, p + 1))
            }
          >
            <Plus />
          </Button>
        </div>
      </div>

      {tooMany ? (
        <CallFallback
          message={t("restaurant.largerParty", { max: restaurant.maxParty })}
          restaurant={restaurant}
          t={t}
        />
      ) : (
        <>
          {/* Date chips — a radio group bounded by the booking horizon */}
          <div role="radiogroup" aria-label={t("restaurant.chooseDate")}>
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("restaurant.chooseDate")}
            </span>
            <div className="scroll-x mt-2 flex gap-2 pb-1">
              {days.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={date === d}
                  onClick={() => setDate(d)}
                  className={cn(
                    "flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-coral/35",
                    date === d
                      ? "animate-pop-in border-transparent bg-gradient-brand text-white shadow-soft"
                      : "border-border bg-card hover:border-coral/45",
                  )}
                >
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {dayLabel(d, i)}
                  </span>
                  <span className="font-display text-lg leading-none font-extrabold tabular-nums">
                    {d.slice(8, 10)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Slots */}
          <div aria-live="polite">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("restaurant.chooseTime")}
            </span>
            {loading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("common.loading")}
              </div>
            ) : fetchFailed ? (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("common.errorTitle")} — {t("common.errorRetry")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={reloadSlots}
                >
                  <RefreshCw data-icon="inline-start" />
                  {t("common.errorRetry")}
                </Button>
                <CallFallback
                  message={t("restaurant.callToBook")}
                  restaurant={restaurant}
                  t={t}
                />
              </div>
            ) : !slots || slots.length === 0 || !anyAvailable ? (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("restaurant.noSlots", { count: party })}
                </p>
                {nextDay ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDate(nextDay)}
                  >
                    {t("restaurant.tryAnotherDay")}:{" "}
                    {shortDay(`${nextDay}T12:00:00Z`, restaurant.timezone, locale)}
                  </Button>
                ) : null}
                <CallFallback
                  message={t("restaurant.callToBook")}
                  restaurant={restaurant}
                  t={t}
                />
              </div>
            ) : (
              <div className="mt-2 space-y-4">
                {grouped.map((group) => (
                  <div key={group.name}>
                    {grouped.length > 1 ? (
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {group.name}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {group.slots.map((s) => {
                        const hhmm = s.slot_local.slice(0, 5);
                        const reasonKey = s.reason
                          ? (REASON_TO_ERROR[s.reason] ?? "generic")
                          : null;
                        return (
                          <button
                            key={s.slot}
                            type="button"
                            disabled={!s.available}
                            aria-pressed={effectiveSelected === hhmm}
                            title={
                              reasonKey
                                ? t(`booking.errors.${reasonKey}`)
                                : undefined
                            }
                            onClick={() => {
                              setSelected(hhmm);
                              setErrorCode(null);
                              requestAnimationFrame(() =>
                                detailsRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                }),
                              );
                            }}
                            className={cn(
                              "rounded-full border px-1 py-2.5 text-sm font-bold tabular-nums transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-coral/35",
                              effectiveSelected === hhmm
                                ? "animate-pop-in border-transparent bg-gradient-brand text-white shadow-soft"
                                : s.available
                                  ? "border-mint/35 bg-mint-soft text-mint hover:border-mint hover:bg-mint hover:text-mint-foreground"
                                  : "cursor-not-allowed border-border bg-muted/60 text-muted-foreground/60 line-through",
                            )}
                          >
                            {hhmm}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booking error — outside the form so it survives the form
              unmounting when a raced-away slot clears the selection. */}
          {errorCode ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive"
            >
              {t(`booking.errors.${errorCode}`)}
            </p>
          ) : null}

          {/* Details form */}
          {effectiveSelected ? (
            <form onSubmit={submit} className="space-y-3.5" ref={detailsRef}>
              <p className="rounded-2xl border border-coral/20 bg-coral-soft px-4 py-3 text-sm font-medium text-coral dark:bg-coral/10">
                {t("booking.summaryLine", {
                  restaurant: restaurant.name,
                  date: shortDay(`${date}T12:00:00Z`, restaurant.timezone, locale),
                  time: effectiveSelected,
                  count: party,
                })}
              </p>
              <div className="grid gap-1.5">
                <Label htmlFor="bw-name">{t("booking.name")}</Label>
                <Input
                  id="bw-name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bw-email">{t("booking.email")}</Label>
                <Input
                  id="bw-email"
                  type="email"
                  required
                  autoComplete="email"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                  aria-invalid={errorCode === "invalid_email" || undefined}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorCode === "invalid_email") setErrorCode(null);
                  }}
                />
              </div>
              {/* Honeypot — visually hidden; the nonsense name keeps browser
                  autofill and password managers from stuffing it (a filled
                  value reads as a bot and rejects the booking). */}
              <input
                ref={honeypotRef}
                type="text"
                name="kx_note"
                tabIndex={-1}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              <Turnstile onToken={setTurnstileToken} />
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={
                  submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    {t("booking.confirming")}
                  </>
                ) : (
                  t("booking.confirmBooking")
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("booking.termsNotice")}
              </p>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}

function CallFallback({
  message,
  restaurant,
  t,
}: {
  message: string;
  restaurant: BookingWidgetRestaurant;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!restaurant.phone && !restaurant.whatsapp) {
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        {restaurant.phone ? (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${restaurant.phone}`}>
              <Phone data-icon="inline-start" />
              {t("restaurant.call")}
            </a>
          </Button>
        ) : null}
        {restaurant.whatsapp ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("restaurant.whatsapp")}
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type OuterProps = Omit<Props, "initial">;

// Reads ?date=&party=&time= client-side (from listing-card availability
// links) — the page itself never touches searchParams, so it stays
// statically renderable.
function BookingWidgetWithParams(props: OuterProps) {
  const searchParams = useSearchParams();
  const date = searchParams.get("date") ?? undefined;
  const partyRaw = Number(searchParams.get("party"));
  const time = searchParams.get("time") ?? undefined;
  const initial = {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    party: Number.isInteger(partyRaw) && partyRaw > 0 ? partyRaw : undefined,
    time: time && /^\d{2}:\d{2}$/.test(time) ? time : undefined,
  };
  // On statically-prerendered pages the first client render sees empty
  // params; keying on them remounts the widget once they resolve, so the
  // initial state actually picks them up.
  const key = `${initial.date ?? ""}|${initial.party ?? ""}|${initial.time ?? ""}`;
  return <WidgetChrome key={key} {...props} initial={initial} />;
}

function WidgetChrome({ restaurant, initial }: Props) {
  const t = useTranslations();

  if (restaurant.bookingMode !== "instant") {
    return (
      <div
        id="book"
        className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6"
      >
        <h2 className="font-display text-xl font-bold">
          {t("restaurant.bookingWidgetTitle")}
        </h2>
        <div className="mt-3">
          <CallFallback
            message={t("restaurant.bookingUnavailable")}
            restaurant={restaurant}
            t={t}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop card */}
      <div
        id="book"
        className="hidden rounded-3xl border border-border bg-card p-6 shadow-float lg:block"
      >
        <h2 className="font-display text-xl font-bold">
          {t("restaurant.bookingWidgetTitle")}
        </h2>
        <div className="mt-5">
          <WidgetBody restaurant={restaurant} initial={initial} />
        </div>
      </div>

      {/* Mobile sticky bar + sheet */}
      <div className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-float lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="brand" size="lg" className="w-full">
              {t("common.bookATable")}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[92dvh] overflow-y-auto rounded-t-3xl p-5"
          >
            <SheetHeader className="p-0 pb-4">
              <SheetTitle className="font-display text-xl font-bold">
                {t("restaurant.bookingWidgetTitle")}
              </SheetTitle>
            </SheetHeader>
            <WidgetBody restaurant={restaurant} initial={initial} />
          </SheetContent>
        </Sheet>
      </div>
      {/* Spacer so content isn't hidden behind the fixed bar */}
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}

export function BookingWidget(props: OuterProps) {
  return (
    <Suspense fallback={<WidgetChrome {...props} />}>
      <BookingWidgetWithParams {...props} />
    </Suspense>
  );
}
