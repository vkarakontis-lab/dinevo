"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { List, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapMarker } from "@/components/map/map-view";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <Skeleton className="h-[65dvh] w-full rounded-xl" />,
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
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={showMap}
          onClick={() => setShowMap((v) => !v)}
        >
          {showMap ? (
            <>
              <List data-icon="inline-start" />
              {t("search.showList")}
            </>
          ) : (
            <>
              <MapIcon data-icon="inline-start" />
              {t("search.showMap")}
            </>
          )}
        </Button>
      </div>
      {showMap ? (
        <MapView markers={markers} center={center} label={t("search.showMap")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </div>
  );
}
