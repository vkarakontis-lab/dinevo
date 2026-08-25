"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveProfile } from "../actions";

type Translation = {
  locale: string;
  name: string;
  tagline: string | null;
  description: string | null;
  is_machine_translated: boolean;
};

type Contact = {
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  menu_url: string;
};

export function ProfileForm({
  restaurantId,
  contact: initialContact,
  translations: initialTranslations,
}: {
  restaurantId: string;
  contact: Contact;
  translations: Translation[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [translations, setTranslations] = useState(initialTranslations);
  const [busy, startTransition] = useTransition();

  const setT = (locale: string, patch: Partial<Translation>) =>
    setTranslations((ts) =>
      ts.map((x) => (x.locale === locale ? { ...x, ...patch } : x)),
    );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveProfile({
        restaurantId,
        translations: translations.map((x) => ({
          locale: x.locale,
          name: x.name,
          tagline: x.tagline ?? "",
          description: x.description ?? "",
        })),
        ...contact,
      });
      if (res.ok) {
        toast.success(t("dashboard.saved"));
        router.refresh();
      } else toast.error(t("common.errorTitle"));
    });
  }

  const field =
    (key: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setContact((c) => ({ ...c, [key]: e.target.value }));

  return (
    <form onSubmit={submit} className="mt-4 space-y-6">
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-lg font-semibold">
          {t("dashboard.textsSection")}
        </h2>
        <Tabs defaultValue={translations[0]?.locale} className="mt-3">
          <TabsList>
            {translations.map((tr) => (
              <TabsTrigger key={tr.locale} value={tr.locale}>
                {tr.locale.toUpperCase()}
                {tr.is_machine_translated ? (
                  <TriangleAlert className="ml-1 size-3.5 text-terracotta" />
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {translations.map((tr) => (
            <TabsContent key={tr.locale} value={tr.locale} className="space-y-3">
              {tr.is_machine_translated ? (
                <p className="rounded-md bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
                  {t("dashboard.reviewTranslationWarning", {
                    locale: tr.locale.toUpperCase(),
                  })}
                </p>
              ) : null}
              <div className="grid gap-1.5">
                <Label htmlFor={`pf-name-${tr.locale}`}>
                  {t("booking.name")}
                </Label>
                <Input
                  id={`pf-name-${tr.locale}`}
                  lang={tr.locale}
                  value={tr.name}
                  onChange={(e) => setT(tr.locale, { name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`pf-tag-${tr.locale}`}>Tagline</Label>
                <Input
                  id={`pf-tag-${tr.locale}`}
                  lang={tr.locale}
                  value={tr.tagline ?? ""}
                  onChange={(e) => setT(tr.locale, { tagline: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`pf-desc-${tr.locale}`}>
                  {t("restaurant.about")}
                </Label>
                <Textarea
                  id={`pf-desc-${tr.locale}`}
                  lang={tr.locale}
                  rows={6}
                  value={tr.description ?? ""}
                  onChange={(e) =>
                    setT(tr.locale, { description: e.target.value })
                  }
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-lg font-semibold">
          {t("dashboard.contactSection")}
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pf-phone">{t("restaurant.call")}</Label>
            <Input id="pf-phone" type="tel" value={contact.phone} onChange={field("phone")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pf-wa">{t("restaurant.whatsapp")}</Label>
            <Input id="pf-wa" type="tel" value={contact.whatsapp} onChange={field("whatsapp")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pf-email">{t("booking.email")}</Label>
            <Input id="pf-email" type="email" value={contact.email} onChange={field("email")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pf-web">{t("restaurant.website")}</Label>
            <Input id="pf-web" type="url" value={contact.website} onChange={field("website")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pf-ig">Instagram</Label>
            <Input id="pf-ig" value={contact.instagram} onChange={field("instagram")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pf-menu">{t("restaurant.viewMenu")}</Label>
            <Input id="pf-menu" type="url" value={contact.menu_url} onChange={field("menu_url")} />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("common.save")}
      </Button>
    </form>
  );
}
