import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getDashboardContext } from "@/lib/dashboard/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { DashboardNav } from "./nav";
import { RestaurantPicker } from "./restaurant-picker";
import { SignOutButton } from "./sign-out-button";
import { BRAND } from "@/config/brand";

// Server-side gate: the proxy only redirects unauthenticated hits; this
// layout re-checks the session and membership for every dashboard page.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const ctx = await getDashboardContext();

  // Login page renders through this layout too — keep chrome minimal there.
  if (!ctx) {
    return <>{children}</>;
  }

  if (!ctx.active && !ctx.isAdmin) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-heading text-2xl font-bold">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground">{t("dashboard.noAccess")}</p>
        <SignOutButton label={t("nav.logout")} />
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="font-heading text-lg font-bold text-primary"
            >
              {BRAND.name}
            </Link>
            {ctx.active ? (
              <RestaurantPicker
                memberships={ctx.memberships.map((m) => ({
                  id: m.restaurant_id,
                  name: m.restaurant.name,
                }))}
                activeId={ctx.active.restaurant_id}
                label={t("dashboard.pickRestaurant")}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {ctx.isAdmin ? (
              <Link
                href="/admin"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Admin
              </Link>
            ) : null}
            <LanguageSwitcher />
            <SignOutButton icon={<LogOut className="size-4" />} label={t("nav.logout")} />
          </div>
        </div>
        {ctx.active ? <DashboardNav /> : null}
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
