import { setRequestLocale, getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center px-4">
      <h1 className="font-heading text-2xl font-bold">{t("signInTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("signInHint")}</p>
      <div className="mt-6">
        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
