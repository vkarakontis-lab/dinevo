"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
      <p className="rounded-lg bg-olive/10 p-4 font-medium text-olive">
        {t("sent")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="fr-restaurant">{t("restaurantName")}</Label>
        <Input id="fr-restaurant" name="restaurantName" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="fr-name">{t("contactName")}</Label>
        <Input id="fr-name" name="contactName" required autoComplete="name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
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
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {tc("errorTitle")} — {tc("errorRetry")}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("send")}
      </Button>
    </form>
  );
}
