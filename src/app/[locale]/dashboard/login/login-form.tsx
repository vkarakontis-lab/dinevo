"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Email magic link / OTP only — no passwords to forget behind the bar.
export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/${locale}/dashboard`,
        shouldCreateUser: false, // access is invite-only (restaurant_members)
      },
    });
    setBusy(false);
    if (err) setError(true);
    else setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-lg bg-olive/10 p-4 font-medium text-olive">
        {t("dashboard.linkSent")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="login-email">{t("booking.email")}</Label>
        <Input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t("common.errorTitle")} — {t("common.errorRetry")}
        </p>
      ) : null}
      <Button type="submit" disabled={busy || !email}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("dashboard.sendLink")}
      </Button>
    </form>
  );
}
