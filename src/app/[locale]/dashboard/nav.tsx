"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", key: "today" },
  { href: "/dashboard/upcoming", key: "upcoming" },
  { href: "/dashboard/bookings", key: "bookings" },
  { href: "/dashboard/availability", key: "availability" },
  { href: "/dashboard/tables", key: "tables" },
  { href: "/dashboard/closures", key: "closures" },
  { href: "/dashboard/profile", key: "profile" },
  { href: "/dashboard/team", key: "team" },
] as const;

export function DashboardNav() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();

  return (
    <nav className="no-print mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
      {ITEMS.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
