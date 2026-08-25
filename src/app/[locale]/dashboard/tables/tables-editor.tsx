"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { confirmRealTables, upsertTable } from "../actions";
import { cn } from "@/lib/utils";

export type TableRow = {
  id: string;
  label: string;
  min_party: number;
  max_party: number;
  is_online_bookable: boolean;
  is_active: boolean;
};

export function TablesEditor({
  restaurantId,
  tables,
  placeholderWarning,
}: {
  restaurantId: string;
  tables: TableRow[];
  placeholderWarning: boolean;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(2);
  const [busy, startTransition] = useTransition();

  function patch(row: TableRow, changes: Partial<TableRow>) {
    startTransition(async () => {
      const res = await upsertTable({
        restaurantId,
        id: row.id,
        label: row.label,
        min_party: row.min_party,
        max_party: row.max_party,
        is_online_bookable: row.is_online_bookable,
        is_active: row.is_active,
        ...changes,
      });
      if (res.ok) router.refresh();
      else toast.error(tc("errorTitle"));
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertTable({
        restaurantId,
        label,
        min_party: min,
        max_party: max,
        is_online_bookable: true,
        is_active: true,
      });
      if (res.ok) {
        setLabel("");
        setAdding(false);
        router.refresh();
      } else toast.error(tc("errorTitle"));
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {placeholderWarning ? (
        <div className="rounded-xl border border-terracotta/50 bg-terracotta/10 p-4">
          <p className="text-sm font-medium">{t("placeholderTablesWarning")}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() =>
              startTransition(async () => {
                const res = await confirmRealTables(restaurantId);
                if (res.ok) router.refresh();
              })
            }
          >
            {tc("confirm")}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {tables.map((row) => (
          <div
            key={row.id}
            className={cn(
              "flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-3",
              !row.is_active && "opacity-50",
            )}
          >
            <span className="w-14 font-bold">{row.label}</span>
            <span className="text-sm text-muted-foreground">
              {row.min_party}–{row.max_party}
            </span>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Switch
                checked={row.is_online_bookable}
                onCheckedChange={(v) => patch(row, { is_online_bookable: v })}
              />
              {t("onlineBookable")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={row.is_active}
                onCheckedChange={(v) => patch(row, { is_active: v })}
              />
              {t("activeLabel")}
            </label>
          </div>
        ))}
      </div>

      {adding ? (
        <form
          onSubmit={add}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-primary/40 bg-card p-4"
        >
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="tb-label">
              {t("tableLabel")}
            </label>
            <Input
              id="tb-label"
              className="w-24"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="tb-min">
              {t("minLabel")}
            </label>
            <Input
              id="tb-min"
              type="number"
              min={1}
              max={40}
              className="w-20"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="tb-max">
              {t("maxLabel")}
            </label>
            <Input
              id="tb-max"
              type="number"
              min={1}
              max={40}
              className="w-20"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdding(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("add")}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus data-icon="inline-start" />
          {t("addTable")}
        </Button>
      )}
    </div>
  );
}
