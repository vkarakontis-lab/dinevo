"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { List, Map as MapIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MapMarker } from "@/components/map/map-view";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <Skeleton className="h-[65dvh] w-full rounded-3xl" />,
});

// The list IS the accessible alternative to the map — both render the same
// restaurants; the toggle only switches presentation.
export function ListingView({
  children,
  markers,
  center,
}: {
  children: React.ReactNode;
  markers: MapMarker[];
  center: { lat: number; lng: number };
}) {
  const t = useTranslations();
  const [showMap, setShowMap] = useState(false);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5">
          <ViewToggle
            active={!showMap}
            onClick={() => setShowMap(false)}
            icon={List}
            label={t("search.showList")}
          />
          <ViewToggle
            active={showMap}
            onClick={() => setShowMap(true)}
            icon={MapIcon}
            label={t("search.showMap")}
          />
        </div>
      </div>
      {showMap ? (
        <MapView markers={markers} center={center} label={t("search.showMap")} />
      ) : (
        <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-coral/35",
        active
          ? "bg-card text-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}
