"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { fromZonedTime } from "date-fns-tz";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addClosure, deleteClosure } from "../actions";
import { formatBookingDay, formatBookingTime } from "@/lib/dates";

export type ClosureRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export function ClosuresEditor({
  restaurantId,
  timezone,
  displayLocale,
  closures,
}: {
  restaurantId: string;
  timezone: string;
  displayLocale: string;
  closures: ClosureRow[];
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    // All-day range in the restaurant's time zone: [from 00:00, to+1 00:00).
    const startsAt = fromZonedTime(`${from}T00:00:00`, timezone);
    const endDay = new Date(`${to}T12:00:00Z`);
    endDay.setUTCDate(endDay.getUTCDate() + 1);
    const endsAt = fromZonedTime(
      `${endDay.toISOString().slice(0, 10)}T00:00:00`,
      timezone,
    );
    startTransition(async () => {
      const res = await addClosure({
        restaurantId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: reason || undefined,
      });
      if (res.ok) {
        setFrom("");
        setTo("");
        setReason("");
        router.refresh();
      } else toast.error(tc("errorTitle"));
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <form
        onSubmit={add}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="cl-from">{t("fromLabel")}</Label>
          <Input
            id="cl-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (!to || to < e.target.value) setTo(e.target.value);
            }}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cl-to">{t("toLabel")}</Label>
          <Input
            id="cl-to"
            type="date"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>
        <div className="grid min-w-40 flex-1 gap-1.5">
          <Label htmlFor="cl-reason">{t("reason")}</Label>
          <Input
            id="cl-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy || !from || !to}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t("addClosure")}
        </Button>
      </form>

      <div className="space-y-2">
        {closures.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium capitalize">
                {formatBookingDay(c.starts_at, timezone, displayLocale)}{" "}
                {formatBookingTime(c.starts_at, timezone)} →{" "}
                {formatBookingDay(c.ends_at, timezone, displayLocale)}{" "}
                {formatBookingTime(c.ends_at, timezone)}
              </p>
              {c.reason ? (
                <p className="text-sm text-muted-foreground">{c.reason}</p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label={tc("delete")}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteClosure(restaurantId, c.id);
                  if (res.ok) router.refresh();
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
