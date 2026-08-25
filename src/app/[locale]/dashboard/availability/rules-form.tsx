"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveBookingRules } from "../actions";

type Rules = {
  min_party: number;
  max_party: number;
  lead_time_minutes: number;
  max_advance_days: number;
  turn_minutes: number;
  slot_interval_minutes: number;
};

export function RulesForm({
  restaurantId,
  initial,
}: {
  restaurantId: string;
  initial: Rules;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [rules, setRules] = useState<Rules>(initial);
  const [busy, startTransition] = useTransition();

  const num =
    (key: keyof Rules) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setRules((r) => ({ ...r, [key]: Number(e.target.value) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveBookingRules({
        restaurantId,
        ...rules,
        slot_interval_minutes: rules.slot_interval_minutes as 15 | 30 | 60,
      });
      if (res.ok) {
        toast.success(t("saved"));
        router.refresh();
      } else toast.error(tc("errorTitle"));
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rf-min">{t("partyLimits")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="rf-min"
              type="number"
              min={1}
              max={40}
              value={rules.min_party}
              onChange={num("min_party")}
            />
            <span aria-hidden>–</span>
            <Input
              aria-label={t("maxLabel")}
              type="number"
              min={1}
              max={40}
              value={rules.max_party}
              onChange={num("max_party")}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rf-lead">{t("leadTime")}</Label>
          <Input
            id="rf-lead"
            type="number"
            min={0}
            step={15}
            value={rules.lead_time_minutes}
            onChange={num("lead_time_minutes")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rf-adv">{t("maxAdvance")}</Label>
          <Input
            id="rf-adv"
            type="number"
            min={1}
            max={365}
            value={rules.max_advance_days}
            onChange={num("max_advance_days")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rf-turn">{t("turnTime")}</Label>
          <Input
            id="rf-turn"
            type="number"
            min={15}
            max={600}
            step={15}
            value={rules.turn_minutes}
            onChange={num("turn_minutes")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label id="rf-interval-label">{t("slotInterval")}</Label>
          <Select
            value={String(rules.slot_interval_minutes)}
            onValueChange={(v) =>
              setRules((r) => ({ ...r, slot_interval_minutes: Number(v) }))
            }
          >
            <SelectTrigger aria-labelledby="rf-interval-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[15, 30, 60].map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {v}′
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="mt-4" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {tc("save")}
      </Button>
    </form>
  );
}
