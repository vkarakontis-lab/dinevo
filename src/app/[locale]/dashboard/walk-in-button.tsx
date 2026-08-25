"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWalkIn } from "./actions";

export function WalkInButton({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [party, setParty] = useState(2);
  const [name, setName] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createWalkIn({
        restaurantId,
        party,
        name: name || undefined,
      });
      if (res.ok) {
        setOpen(false);
        setName("");
        setParty(2);
        router.refresh();
      } else {
        toast.error(
          res.error ? t(`booking.errors.${res.error}`) : t("common.errorTitle"),
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {t("dashboard.walkIn")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dashboard.walkIn")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wi-party">{t("dashboard.walkInParty")}</Label>
            <Input
              id="wi-party"
              type="number"
              min={1}
              max={40}
              value={party}
              onChange={(e) => setParty(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wi-name">{t("dashboard.walkInName")}</Label>
            <Input
              id="wi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("common.confirm")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
