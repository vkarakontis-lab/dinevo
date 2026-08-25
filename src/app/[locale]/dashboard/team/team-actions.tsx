"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
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
import { inviteMember, removeMember } from "../actions";

export function TeamActions({
  restaurantId,
  memberUserId,
}: {
  restaurantId: string;
  memberUserId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-destructive"
      aria-label={t("dashboard.removeMember")}
      onClick={() =>
        startTransition(async () => {
          const res = await removeMember(restaurantId, memberUserId);
          if (res.ok) router.refresh();
          else toast.error(t("common.errorTitle"));
        })
      }
    >
      <Trash2 />
    </Button>
  );
}

export function InviteForm({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "manager" | "staff">("staff");
  const [busy, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await inviteMember({ restaurantId, email, role });
      if (res.ok) {
        setEmail("");
        toast.success(t("dashboard.saved"));
        router.refresh();
      } else toast.error(t("common.errorTitle"));
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="grid min-w-52 flex-1 gap-1.5">
        <Label htmlFor="tm-email">{t("booking.email")}</Label>
        <Input
          id="tm-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label id="tm-role-label">{t("dashboard.roleLabel")}</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as typeof role)}
        >
          <SelectTrigger aria-labelledby="tm-role-label" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">staff</SelectItem>
            <SelectItem value="manager">manager</SelectItem>
            <SelectItem value="owner">owner</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={busy || !email}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("dashboard.inviteSend")}
      </Button>
    </form>
  );
}
