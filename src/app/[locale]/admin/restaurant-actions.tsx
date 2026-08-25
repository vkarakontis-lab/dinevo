"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { setRestaurantStatus, setRestaurantFeatured } from "./actions";

export function AdminRestaurantActions({
  restaurantId,
  status,
  isFeatured,
}: {
  restaurantId: string;
  status: string;
  isFeatured: boolean;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else toast.error(tc("errorTitle"));
    });

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant={status === "published" ? "ghost" : "default"}
        disabled={busy}
        onClick={() =>
          run(() =>
            setRestaurantStatus(
              restaurantId,
              status === "published" ? "draft" : "published",
            ),
          )
        }
      >
        {status === "published" ? t("unpublish") : t("publish")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => run(() => setRestaurantFeatured(restaurantId, !isFeatured))}
      >
        {isFeatured ? t("unfeature") : t("feature")}
      </Button>
    </div>
  );
}
