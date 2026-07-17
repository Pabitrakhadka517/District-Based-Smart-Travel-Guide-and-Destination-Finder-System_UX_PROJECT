"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { Destination, TouristAttraction, Trek, Festival, GuideArticle, District } from "@/types";
import { type MapEntry } from "@/lib/map-entry-helpers";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlyToTarget } from "@/components/maps/leaflet/fly-to-controller";
import type { WeatherPoint } from "@/components/maps/leaflet/weather-layer";

const NepalMap = dynamic(
  () => import("@/components/maps/leaflet/nepal-map").then((m) => m.NepalMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

interface Props {
  district: District;
  destinations: Destination[];
  attractions: TouristAttraction[];
  treks: Trek[];
  festivals: Festival[];
  guides: GuideArticle[];
}

export function DistrictMap({ district, destinations, attractions, treks, festivals, guides }: Props) {
  const districtsById = useMemo(() => new Map([[district.id, district]]), [district]);

  const entries = useMemo<MapEntry[]>(() => [
    ...destinations.map((d): MapEntry => ({ kind: "destination", data: d })),
    ...attractions.map((a): MapEntry => ({ kind: "attraction", data: a })),
    ...treks.map((t): MapEntry => ({ kind: "trek", data: t })),
    ...festivals.map((f): MapEntry => ({ kind: "festival", data: f })),
    ...guides.map((g): MapEntry => ({ kind: "guide", data: g })),
  ], [destinations, attractions, treks, festivals, guides]);

  const flyToTarget = useMemo<FlyToTarget>(() => ({
    id: `district-${district.id}`,
    lat: district.coordinates.lat,
    lng: district.coordinates.lng,
    zoom: 11,
  }), [district]);

  const weatherPoints = useMemo<WeatherPoint[]>(() => [
    { id: district.id, lat: district.coordinates.lat, lng: district.coordinates.lng, label: district.name },
  ], [district]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-border shadow-soft">
      <NepalMap
        entries={entries}
        districtsById={districtsById}
        onSelect={() => {}}
        flyToTarget={flyToTarget}
        provinceCounts={{}}
        heatPoints={[]}
        showHeatmap={false}
        weatherPoints={weatherPoints}
        showWeather
      />
    </div>
  );
}
