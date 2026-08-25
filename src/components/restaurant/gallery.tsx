"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { photoUrl } from "@/lib/photo";
import type { PhotoData } from "@/lib/data/restaurants";
import { cn } from "@/lib/utils";

export function Gallery({
  photos,
  restaurantName,
}: {
  photos: PhotoData[];
  restaurantName: string;
}) {
  const locale = useLocale();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;
  const sorted = [...photos].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
  );
  const altFor = (p: PhotoData) =>
    (p.alt as Record<string, string> | null)?.[locale] ?? restaurantName;

  const show = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  const step = (delta: number) =>
    setIndex((i) => (i + delta + sorted.length) % sorted.length);

  return (
    <>
      <div className="relative grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl">
        <button
          type="button"
          onClick={() => show(0)}
          aria-label={`${t("restaurant.photos")} — ${restaurantName}`}
          className={cn(
            "group relative row-span-2 aspect-auto min-h-52 overflow-hidden bg-muted sm:min-h-72",
            sorted.length > 1 ? "col-span-3" : "col-span-4",
          )}
        >
          <Image
            src={photoUrl(sorted[0].storage_path, 1600)}
            alt={altFor(sorted[0])}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            placeholder={sorted[0].blur_data_url ? "blur" : "empty"}
            blurDataURL={sorted[0].blur_data_url ?? undefined}
          />
        </button>
        {sorted.slice(1, 3).map((p, i) => (
          <button
            key={p.storage_path}
            type="button"
            onClick={() => show(i + 1)}
            aria-label={`${t("restaurant.photos")} ${i + 2}`}
            className="group relative col-span-1 aspect-auto min-h-24 overflow-hidden bg-muted"
          >
            <Image
              src={photoUrl(p.storage_path, 800)}
              alt={altFor(p)}
              fill
              sizes="33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              placeholder={p.blur_data_url ? "blur" : "empty"}
              blurDataURL={p.blur_data_url ?? undefined}
            />
            {i === 1 && sorted.length > 3 ? (
              <span
                className="absolute inset-0 flex items-center justify-center bg-[rgba(6,8,14,0.55)] font-display text-xl font-extrabold text-white"
                aria-hidden
              >
                +{sorted.length - 3}
              </span>
            ) : null}
          </button>
        ))}

        {sorted.length > 1 ? (
          <button
            type="button"
            onClick={() => show(0)}
            className="glass-dark absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[rgba(6,8,14,0.62)] focus-visible:ring-[3px] focus-visible:ring-white/50 focus-visible:outline-none"
          >
            <Images className="size-4" aria-hidden />
            {t("restaurant.viewAllPhotos")}
          </button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-5xl rounded-3xl border-none bg-[rgba(6,8,14,0.96)] p-3 sm:p-5"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {t("restaurant.photos")} — {restaurantName}
          </DialogTitle>
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl">
            <Image
              src={photoUrl(sorted[index].storage_path, 1600)}
              alt={altFor(sorted[index])}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-between text-white">
            <button
              type="button"
              aria-label={t("common.previous")}
              onClick={() => step(-1)}
              className="rounded-full p-2.5 transition-colors hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <ChevronLeft />
            </button>
            <span className="text-sm font-semibold tabular-nums">
              {index + 1} / {sorted.length}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={t("common.next")}
                onClick={() => step(1)}
                className="rounded-full p-2.5 transition-colors hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <ChevronRight />
              </button>
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => setOpen(false)}
                className="rounded-full p-2.5 transition-colors hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <X />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
