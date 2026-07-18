"use client";
import { useState, useMemo } from "react";
import { MapPin, Zap, Mountain, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOREST, SUCCESS, SECONDARY, BORDER, SECTION_BACKGROUND } from "@/lib/theme-colors";

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: "destination" | "attraction" | "trek" | "festival";
}

const NEPAL_BOUNDS = { minLat: 26.3, maxLat: 30.5, minLng: 80.0, maxLng: 88.2 };

/**
 * Fits the projection bounds to the given markers (with padding) instead of
 * always projecting against the whole country — a tight same-district
 * cluster (the common case for a trip summary, where every marker is a few
 * km apart) would otherwise collapse into a handful of overlapping pixels.
 * Falls back to the full-Nepal box when there's nothing to fit around.
 */
function computeBounds(markers: MapMarker[]): typeof NEPAL_BOUNDS {
  if (markers.length === 0) return NEPAL_BOUNDS;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const m of markers) {
    minLat = Math.min(minLat, m.lat);
    maxLat = Math.max(maxLat, m.lat);
    minLng = Math.min(minLng, m.lng);
    maxLng = Math.max(maxLng, m.lng);
  }

  // Pad by 30% of the span on each side, with a floor of ~0.03° (a few km)
  // so a single marker or a very tight cluster still gets visible breathing
  // room instead of collapsing to a zero-size box.
  const latPad = Math.max((maxLat - minLat) * 0.3, 0.03);
  const lngPad = Math.max((maxLng - minLng) * 0.3, 0.03);

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

const TYPE_COLORS: Record<NonNullable<MapMarker["type"]>, string> = {
  destination: "text-accent",
  attraction: "text-secondary",
  trek: "text-success",
  festival: "text-purple",
};
const TYPE_FILL: Record<NonNullable<MapMarker["type"]>, string> = {
  destination: "fill-accent",
  attraction: "fill-secondary",
  trek: "fill-success",
  festival: "fill-purple",
};

interface MapWidgetProps {
  markers: MapMarker[];
  height?: string;
  activeId?: string | null;
  onSelect?: (m: MapMarker) => void;
  /** Draws a connecting line through `markers` in the order given, with a
   *  numbered badge on each stop — used to visualize a trip's planned route. */
  route?: boolean;
}

export function MapWidget({ markers, height = "h-[420px]", activeId, onSelect, route = false }: MapWidgetProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const bounds = useMemo(() => computeBounds(markers), [markers]);
  const project = (lat: number, lng: number) => ({
    x: ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
    y: (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100,
  });

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary/5 via-brand-50 to-secondary/10",
        height
      )}
    >
      {/* Terrain SVG backdrop */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SECONDARY} stopOpacity="0.12" />
            <stop offset="100%" stopColor={SECONDARY} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FOREST} stopOpacity="0.35" />
            <stop offset="100%" stopColor={FOREST} stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#skyGrad)" />
        {/* Snow peaks */}
        <path d="M5,35 L12,20 L19,35 Z" fill={BORDER} opacity="0.7" />
        <path d="M18,32 L27,14 L36,32 Z" fill={SECTION_BACKGROUND} opacity="0.8" />
        <path d="M33,35 L42,18 L51,35 Z" fill={BORDER} opacity="0.7" />
        <path d="M55,38 L62,22 L69,38 Z" fill={SECTION_BACKGROUND} opacity="0.6" />
        <path d="M72,36 L80,17 L88,36 Z" fill={BORDER} opacity="0.75" />
        {/* Mid hills */}
        <path d="M0,55 Q20,42 40,50 T80,48 T100,55 L100,100 L0,100 Z" fill="url(#hillGrad)" />
        {/* Lowland plains */}
        <path d="M0,72 Q30,65 60,70 T100,68 L100,100 L0,100 Z" fill={SUCCESS} opacity="0.15" />
        {/* Rivers (faint blue lines) */}
        <path d="M20,55 Q30,65 25,80" stroke={SECONDARY} strokeWidth="0.5" fill="none" opacity="0.5" />
        <path d="M50,50 Q60,62 55,80" stroke={SECONDARY} strokeWidth="0.5" fill="none" opacity="0.5" />
        <path d="M70,54 Q78,65 74,80" stroke={SECONDARY} strokeWidth="0.5" fill="none" opacity="0.4" />
      </svg>

      {/* Label */}
      <span className="absolute left-4 top-4 z-10 rounded-lg bg-white/85 px-3 py-1 text-xs font-semibold text-brand-600 backdrop-blur shadow-sm">
        Nepal · Interactive Map
      </span>

      {/* Route line — connects markers in the given order, same 0-100
          coordinate space (and non-uniform stretch) as marker positioning
          below, so the line lines up with the pins exactly. */}
      {route && markers.length > 1 && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 z-[5] h-full w-full" aria-hidden>
          <polyline
            points={markers.map((m) => { const p = project(m.lat, m.lng); return `${p.x},${p.y}`; }).join(" ")}
            fill="none"
            stroke={SECONDARY}
            strokeWidth="0.6"
            strokeDasharray="2.2 1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
        </svg>
      )}

      {/* Markers */}
      {markers.map((m, i) => {
        const { x, y } = project(m.lat, m.lng);
        const isActive = activeId === m.id;
        const isHovered = hovered === m.id;
        const type = m.type ?? "destination";

        return (
          <button
            key={m.id}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => { onSelect?.(m); }}
            onMouseEnter={() => setHovered(m.id)}
            onMouseLeave={() => setHovered(null)}
            className="group absolute z-10 -translate-x-1/2 -translate-y-full focus:outline-none"
            aria-label={route ? `Stop ${i + 1}: ${m.name}` : m.name}
          >
            {/* Ring for active */}
            {isActive && (
              <span className={cn(
                "absolute inset-0 -translate-x-[5px] -translate-y-[2px] h-9 w-9 rounded-full ring-2 ring-offset-1",
                type === "destination" ? "ring-accent" : "ring-secondary"
              )} />
            )}

            {route && (
              <span className="absolute -left-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white shadow ring-2 ring-white">
                {i + 1}
              </span>
            )}

            <MapPin
              size={isActive ? 34 : isHovered ? 30 : 24}
              className={cn(
                "drop-shadow-md transition-all duration-150",
                TYPE_COLORS[type],
                TYPE_FILL[type]
              )}
            />

            {/* Tooltip */}
            <span className={cn(
              "pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-700 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg transition-opacity",
              isActive || isHovered ? "opacity-100" : "opacity-0"
            )}>
              {m.name}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-brand-700" />
            </span>
          </button>
        );
      })}

      {/* Empty state for filtered views */}
      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-white/80 px-5 py-3 text-center backdrop-blur shadow">
            <p className="text-sm font-medium text-muted-foreground">No map coordinates available</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Browse the list on the right</p>
          </div>
        </div>
      )}

      {/* Legend — only shows the kinds actually present on this map */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 rounded-xl bg-white/88 p-3 text-xs shadow backdrop-blur">
        {markers.some((m) => (m.type ?? "destination") === "destination") && (
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="fill-accent text-accent" />
            Destination
          </span>
        )}
        {markers.some((m) => m.type === "attraction") && (
          <span className="flex items-center gap-1.5">
            <Zap size={13} className="fill-secondary text-secondary" />
            Attraction
          </span>
        )}
        {markers.some((m) => m.type === "trek") && (
          <span className="flex items-center gap-1.5">
            <Mountain size={13} className="fill-success text-success" />
            Trek
          </span>
        )}
        {markers.some((m) => m.type === "festival") && (
          <span className="flex items-center gap-1.5">
            <PartyPopper size={13} className="fill-purple text-purple" />
            Festival
          </span>
        )}
      </div>
    </div>
  );
}
