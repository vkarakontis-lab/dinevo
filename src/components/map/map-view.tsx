"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MLMap = maplibregl.Map;
type Marker = maplibregl.Marker;

export type MapMarker = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
  href: string;
};

// MapLibre + OpenFreeMap tiles: free, no API key. Loaded lazily (next/dynamic
// in ListingView) so the map bundle never blocks the list.
export default function MapView({
  markers,
  center,
  heightClass = "h-[65dvh]",
  zoom = 12,
  label = "Map",
}: {
  markers: MapMarker[];
  center: { lat: number; lng: number };
  heightClass?: string;
  zoom?: number;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [center.lng, center.lat],
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const created: Marker[] = [];
    for (const m of markers) {
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false })
        .setHTML(
          `<a href="${m.href}" style="font-weight:600;color:#1f4e79;text-decoration:none">${m.name}</a>` +
            (m.subtitle
              ? `<div style="color:#6d675d;font-size:12px">${m.subtitle}</div>`
              : ""),
        );
      const marker = new maplibregl.Marker({ color: "#c8663a" })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup)
        .addTo(map);
      created.push(marker);
    }
    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
    }
    return () => created.forEach((m) => m.remove());
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className={`${heightClass} w-full overflow-hidden rounded-xl border border-border`}
      role="region"
      aria-label={label}
    />
  );
}
