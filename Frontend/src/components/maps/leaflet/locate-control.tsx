"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

export interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Floating "find me" button. Uses Leaflet's own `map.locate()` (wraps the
 * browser Geolocation API) rather than `navigator.geolocation` directly, so
 * it gets free map integration: `setView` centers/zooms to the result, and
 * `locationfound`/`locationerror` are plain Leaflet map events other map
 * children could also listen for.
 *
 * Draws a "you are here" dot + accuracy circle imperatively via the Leaflet
 * instance (not react-leaflet `<Marker>`/`<Circle>`) since this position
 * updates independently of any props this component receives.
 */
export function LocateControl({ onLocate }: { onLocate?: (loc: UserLocation | null) => void }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    const handleFound = (e: L.LocationEvent) => {
      setLocating(false);
      const { lat, lng } = e.latlng;

      markerRef.current?.remove();
      circleRef.current?.remove();

      markerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px rgba(37,99,235,0.35),0 2px 6px rgba(0,0,0,0.35);"></div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
        zIndexOffset: 1000,
        interactive: false,
        keyboard: false,
      }).addTo(map);

      circleRef.current = L.circle([lat, lng], {
        radius: e.accuracy,
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.08,
        weight: 1,
        interactive: false,
      }).addTo(map);

      onLocate?.({ lat, lng });
    };

    const handleError = () => {
      setLocating(false);
      toast.error("Couldn't get your location — check your browser's location permission.");
      onLocate?.(null);
    };

    map.on("locationfound", handleFound);
    map.on("locationerror", handleError);
    return () => {
      map.off("locationfound", handleFound);
      map.off("locationerror", handleError);
      markerRef.current?.remove();
      circleRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return (
    <button
      onClick={() => {
        setLocating(true);
        map.locate({ setView: true, maxZoom: 14, enableHighAccuracy: true });
      }}
      disabled={locating}
      aria-label="Find my location"
      title="Find my location"
      className={cn(
        "absolute bottom-3 right-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/90 text-brand-700 shadow-soft backdrop-blur-md transition hover:bg-white",
        locating && "opacity-70"
      )}
    >
      {locating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
    </button>
  );
}
