"use client";

import "leaflet/dist/leaflet.css";

import { useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Marker as LeafletMarker } from "leaflet";
import type { District } from "@/types";
import { entryId, entryCoordinates, type MapEntry, type MapKind } from "@/lib/map-entry-helpers";
import { buildDivIcon, buildClusterIcon } from "./marker-icon";
import { MapPopupContent } from "./map-popup-content";
import { FlyToController, type FlyToTarget } from "./fly-to-controller";
import { ProvinceLayer } from "./province-layer";
import { HeatmapLayer, type HeatPoint } from "./heatmap-layer";
import { WeatherLayer, type WeatherPoint } from "./weather-layer";
import { LocateControl, type UserLocation } from "./locate-control";

const NEPAL_CENTER: [number, number] = [28.3949, 84.1240];

export function NepalMap({
  entries,
  districtsById,
  onSelect,
  flyToTarget,
  provinceCounts,
  heatPoints,
  showHeatmap,
  weatherPoints,
  showWeather,
  onLocate,
}: {
  entries: MapEntry[];
  districtsById: Map<string, District>;
  onSelect: (entry: MapEntry) => void;
  flyToTarget: FlyToTarget | null;
  provinceCounts: Record<string, number>;
  heatPoints: HeatPoint[];
  showHeatmap: boolean;
  weatherPoints: WeatherPoint[];
  showWeather: boolean;
  onLocate?: (loc: UserLocation | null) => void;
}) {
  const markerRefs = useRef<Map<string, LeafletMarker>>(new Map());

  return (
    <MapContainer
      center={NEPAL_CENTER}
      zoom={7}
      minZoom={6}
      maxZoom={17}
      scrollWheelZoom
      className="h-full w-full rounded-2xl"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      <ProvinceLayer provinceCounts={provinceCounts} />

      <MarkerClusterGroup
        iconCreateFunction={buildClusterIcon}
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
      >
        {entries.map((entry) => {
          const id = entryId(entry);
          const { lat, lng } = entryCoordinates(entry);
          return (
            <Marker
              key={`${entry.kind}-${id}`}
              position={[lat, lng]}
              icon={buildDivIcon(entry.kind as MapKind)}
              eventHandlers={{
                click: (e) => {
                  // react-leaflet-cluster's MarkerClusterGroup doesn't reliably trigger
                  // Leaflet's own bindPopup click-toggle, so open it explicitly here.
                  e.target.openPopup();
                  onSelect(entry);
                },
              }}
              ref={(m) => {
                if (m) markerRefs.current.set(id, m);
                else markerRefs.current.delete(id);
              }}
            >
              <Popup maxWidth={260} minWidth={220} className="[&_.leaflet-popup-content-wrapper]:rounded-xl">
                <MapPopupContent entry={entry} districtsById={districtsById} />
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>

      <HeatmapLayer points={heatPoints} visible={showHeatmap} />
      <WeatherLayer points={weatherPoints} visible={showWeather} />

      <FlyToController target={flyToTarget} markerRefs={markerRefs} />
      <LocateControl onLocate={onLocate} />
    </MapContainer>
  );
}
