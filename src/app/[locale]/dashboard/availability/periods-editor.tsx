"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteServicePeriod, upsertServicePeriod } from "../actions";
import { cn } from "@/lib/utils";

export type PeriodRow = {
  id: string;
  name: Record<string, string>;
  weekdays: number[];
  first_seating: string;
  last_seating: string;
  turn_minutes: number | null;
  slot_interval_minutes: number | null;
  max_covers_per_slot: number | null;
  is_active: boolean;
};

const DAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DAYS_EL = ["Δε", "Τρ", "Τε", "Πέ", "Πα", "Σά", "Κυ"];

type Draft = {
  id?: string;
  nameEn: string;
  nameEl: string;
  weekdays: number[];
  first_seating: string;
  last_seating: string;
  turn_minutes: string;
  max_covers_per_slot: string;
  is_active: boolean;
};

const emptyDraft: Draft = {
  nameEn: "Dinner",
  nameEl: "Δείπνο",
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  first_seating: "18:00",
  last_seating: "21:30",
  turn_minutes: "",
  max_covers_per_slot: "",
  is_active: true,
};

export function PeriodsEditor({
  restaurantId,
  periods,
}: {
  restaurantId: string;
  periods: PeriodRow[];
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, startTransition] = useTransition();
  const dayNames = locale === "el" ? DAYS_EL : DAYS_EN;

  function edit(p: PeriodRow) {
    setDraft({
      id: p.id,
      nameEn: p.name.en ?? "",
      nameEl: p.name.el ?? "",
      weekdays: p.weekdays,
      first_seating: p.first_seating.slice(0, 5),
      last_seating: p.last_seating.slice(0, 5),
      turn_minutes: p.turn_minutes ? String(p.turn_minutes) : "",
      max_covers_per_slot: p.max_covers_per_slot
        ? String(p.max_covers_per_slot)
        : "",
      is_active: p.is_active,
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const res = await upsertServicePeriod({
        restaurantId,
        id: draft.id,
        nameEn: draft.nameEn,
        nameEl: draft.nameEl,
        weekdays: draft.weekdays,
        first_seating: draft.first_seating,
        last_seating: draft.last_seating,
        turn_minutes: draft.turn_minutes ? Number(draft.turn_minutes) : null,
        slot_interval_minutes: null,
        max_covers_per_slot: draft.max_covers_per_slot
          ? Number(draft.max_covers_per_slot)
          : null,
        is_active: draft.is_active,
      });
      if (res.ok) {
        toast.success(t("saved"));
        setDraft(null);
        router.refresh();
      } else toast.error(tc("errorTitle"));
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteServicePeriod(restaurantId, id);
      if (res.ok) router.refresh();
      else toast.error(tc("errorTitle"));
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">
          {t("servicePeriods")}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setDraft(emptyDraft)}>
          <Plus data-icon="inline-start" />
          {t("addPeriod")}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {periods.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3",
              !p.is_active && "opacity-50",
            )}
          >
            <button
              type="button"
              onClick={() => edit(p)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="font-medium">
                {p.name[locale] ?? p.name.en} · {p.first_seating.slice(0, 5)}–
                {p.last_seating.slice(0, 5)}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.weekdays.map((d) => dayNames[d - 1]).join(" ")}
                {p.turn_minutes ? ` · ${p.turn_minutes}′` : ""}
                {p.max_covers_per_slot
                  ? ` · ≤${p.max_covers_per_slot}`
                  : ""}
              </p>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label={tc("delete")}
              onClick={() => remove(p.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      {draft ? (
        <form
          onSubmit={save}
          className="mt-4 grid gap-4 rounded-xl border border-primary/40 bg-card p-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pe-name-en">{t("periodName")}</Label>
              <Input
                id="pe-name-en"
                value={draft.nameEn}
                onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pe-name-el" className="invisible">
                EL
              </Label>
              <Input
                id="pe-name-el"
                lang="el"
                value={draft.nameEl}
                onChange={(e) => setDraft({ ...draft, nameEl: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label>{t("weekdaysLabel")}</Label>
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={draft.weekdays.includes(d)}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      weekdays: draft.weekdays.includes(d)
                        ? draft.weekdays.filter((x) => x !== d)
                        : [...draft.weekdays, d].sort(),
                    })
                  }
                  className={cn(
                    "size-9 rounded-md border text-sm font-medium",
                    draft.weekdays.includes(d)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {dayNames[d - 1]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pe-first">{t("firstSeating")}</Label>
              <Input
                id="pe-first"
                type="time"
                step={900}
                value={draft.first_seating}
                onChange={(e) =>
                  setDraft({ ...draft, first_seating: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pe-last">{t("lastSeating")}</Label>
              <Input
                id="pe-last"
                type="time"
                step={900}
                value={draft.last_seating}
                onChange={(e) =>
                  setDraft({ ...draft, last_seating: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pe-turn">{t("turnTime")}</Label>
              <Input
                id="pe-turn"
                type="number"
                min={15}
                max={600}
                step={15}
                value={draft.turn_minutes}
                onChange={(e) =>
                  setDraft({ ...draft, turn_minutes: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pe-pacing">{t("pacing")}</Label>
              <Input
                id="pe-pacing"
                type="number"
                min={1}
                max={500}
                value={draft.max_covers_per_slot}
                onChange={(e) =>
                  setDraft({ ...draft, max_covers_per_slot: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
              {t("activeLabel")}
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft(null)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {tc("save")}
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}
