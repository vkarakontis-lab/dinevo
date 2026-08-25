import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations();

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-heading text-3xl">{t("common.notFound")}</h1>
      <Button asChild>
        <Link href="/">{t("nav.home")}</Link>
      </Button>
    </main>
  );
}
