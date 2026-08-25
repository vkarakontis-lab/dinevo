"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitListingRequest } from "./actions";

export function ContactForm() {
  const t = useTranslations("forRestaurants");
  const tc = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const form = new FormData(e.currentTarget);
    const res = await submitListingRequest({
      restaurantName: String(form.get("restaurantName") ?? ""),
      contactName: String(form.get("contactName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      message: String(form.get("message") ?? ""),
      website: String(form.get("website") ?? ""),
    });
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(true);
  }

  if (sent) {
    return (
      <div
        className="flex flex-col items-center rounded-2xl border border-mint/25 bg-mint-soft px-6 py-10 text-center dark:bg-mint/10"
        role="status"
      >
        <span
          className="flex size-14 items-center justify-center rounded-full bg-mint text-mint-foreground"
          aria-hidden
        >
          <Check className="size-7" strokeWidth={3} />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-balance text-mint">
          {t("sent")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
      <div className="grid gap-1.5">
        <Label htmlFor="fr-restaurant">{t("restaurantName")}</Label>
        <Input id="fr-restaurant" name="restaurantName" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="fr-name">{t("contactName")}</Label>
        <Input id="fr-name" name="contactName" required autoComplete="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="fr-email">{t("contactEmail")}</Label>
          <Input
            id="fr-email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fr-phone">{t("contactPhone")}</Label>
          <Input id="fr-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="fr-message">{t("message")}</Label>
        <Textarea id="fr-message" name="message" rows={3} />
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div aria-live="polite">
        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive"
          >
            {tc("errorTitle")} — {tc("errorRetry")}
          </p>
        ) : null}
      </div>
      <Button type="submit" variant="brand" size="lg" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("send")}
      </Button>
    </form>
  );
}
