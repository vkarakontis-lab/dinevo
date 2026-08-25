"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBookingTime, shortDay } from "@/lib/dates";
import { updateBookingStatus } from "./actions";
import type { DashboardBooking } from "@/lib/dashboard/bookings";
import type { BookingStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-olive text-olive-foreground",
  seated: "bg-primary text-primary-foreground",
  pending: "bg-terracotta text-terracotta-foreground",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/15 text-destructive",
  no_show: "bg-destructive/15 text-destructive",
};

// Designed for a thumb and a glance: big tap targets, colour + text status.
export function BookingRow({
  booking,
  restaurantId,
  timezone,
  showDay = false,
}: {
  booking: DashboardBooking;
  restaurantId: string;
  timezone: string;
  showDay?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null);
  const [confirming, setConfirming] = useState<"cancelled" | "no_show" | null>(
    null,
  );
  const [, startTransition] = useTransition();

  const status = pendingStatus ?? booking.status;
  const live = status === "pending" || status === "confirmed" || status === "seated";

  function apply(next: BookingStatus) {
    setPendingStatus(next); // optimistic
    startTransition(async () => {
      const res = await updateBookingStatus({
        restaurantId,
        bookingId: booking.id,
        status: next as "confirmed" | "seated" | "completed" | "cancelled" | "no_show",
      });
      if (!res.ok) {
        setPendingStatus(null);
        toast.error(t("common.errorTitle"));
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card p-4">
      <div className="w-16 shrink-0">
        <p className="text-lg font-bold tabular-nums">
          {formatBookingTime(booking.starts_at, timezone)}
        </p>
        {showDay ? (
          <p className="text-xs text-muted-foreground">
            {shortDay(booking.starts_at, timezone, locale)}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {booking.guest_name}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {t("common.people", { count: booking.party_size })}
            {booking.dining_tables?.label
              ? ` · ${t("dashboard.table")} ${booking.dining_tables.label}`
              : ""}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {booking.confirmation_code}
          {booking.source !== "web" ? ` · ${booking.source}` : ""}
          {booking.special_requests ? ` · “${booking.special_requests}”` : ""}
        </p>
      </div>
      <Badge className={cn("shrink-0", STATUS_STYLE[status])}>
        {t("booking.statusLabel", { status })}
      </Badge>
      {booking.guest_phone ? (
        <Button asChild variant="outline" size="icon-sm" className="size-8">
          <a href={`tel:${booking.guest_phone}`} aria-label={t("restaurant.call")}>
            <Phone />
          </a>
        </Button>
      ) : null}
      {live ? (
        <div className="flex shrink-0 gap-1.5">
          {status === "pending" ? (
            <Button size="sm" onClick={() => apply("confirmed")}>
              {t("dashboard.confirmBooking")}
            </Button>
          ) : null}
          {status === "confirmed" ? (
            <Button size="sm" variant="secondary" onClick={() => apply("seated")}>
              {t("dashboard.markSeated")}
            </Button>
          ) : null}
          {status === "seated" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => apply("completed")}
            >
              {t("dashboard.markCompleted")}
            </Button>
          ) : null}
          {status === "confirmed" ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirming("no_show")}
            >
              {t("dashboard.markNoShow")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => setConfirming("cancelled")}
          >
            {t("dashboard.cancelBooking")}
          </Button>
        </div>
      ) : null}

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirming === "no_show"
                ? t("dashboard.markNoShow")
                : t("dashboard.cancelBooking")}
            </DialogTitle>
            <DialogDescription>
              {booking.guest_name} ·{" "}
              {formatBookingTime(booking.starts_at, timezone)} ·{" "}
              {t("common.people", { count: booking.party_size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {t("common.back")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirming) apply(confirming);
                setConfirming(null);
              }}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
