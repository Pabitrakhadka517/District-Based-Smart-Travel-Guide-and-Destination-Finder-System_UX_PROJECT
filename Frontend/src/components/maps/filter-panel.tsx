"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Zap, Footprints, CalendarDays, BookOpen, Flame, CloudSun, SlidersHorizontal, X } from "lucide-react";
import type { MapKind } from "@/lib/map-entry-helpers";
import { MARKER_COLORS } from "@/lib/marker-colors";
import { cn } from "@/lib/utils";

const FILTERS: { kind: MapKind; label: string; icon: React.ReactNode }[] = [
  { kind: "destination", label: "Destinations", icon: <MapPin size={13} /> },
  { kind: "attraction", label: "Attractions", icon: <Zap size={13} /> },
  { kind: "trek", label: "Treks", icon: <Footprints size={13} /> },
  { kind: "festival", label: "Festivals", icon: <CalendarDays size={13} /> },
  { kind: "guide", label: "Guides", icon: <BookOpen size={13} /> },
];

interface FilterPanelProps {
  visibleKinds: Set<MapKind>;
  onToggleKind: (kind: MapKind) => void;
  counts: Record<MapKind, number>;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showWeather: boolean;
  onToggleWeather: () => void;
}

type ChipProps = Omit<FilterPanelProps, "showHeatmap" | "onToggleHeatmap" | "showWeather" | "onToggleWeather">;

function FilterChips({ visibleKinds, onToggleKind, counts }: ChipProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {FILTERS.map(({ kind, label, icon }) => {
        const active = visibleKinds.has(kind);
        return (
          <button
            key={kind}
            onClick={() => onToggleKind(kind)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
              active ? "border-transparent bg-brand-50 text-brand-700" : "border-border bg-white/60 text-muted-foreground"
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: MARKER_COLORS[kind], opacity: active ? 1 : 0.35 }}
            />
            <span className="flex flex-1 items-center gap-1.5">
              {icon}
              {label}
            </span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground")}>
              {counts[kind]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HeatmapToggle({ showHeatmap, onToggleHeatmap }: Pick<FilterPanelProps, "showHeatmap" | "onToggleHeatmap">) {
  return (
    <button
      onClick={onToggleHeatmap}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
        showHeatmap ? "border-transparent bg-accent text-accent-foreground" : "border-border bg-white/60 text-muted-foreground"
      )}
    >
      <Flame size={13} />
      Popularity Heatmap
    </button>
  );
}

function WeatherToggle({ showWeather, onToggleWeather }: Pick<FilterPanelProps, "showWeather" | "onToggleWeather">) {
  return (
    <button
      onClick={onToggleWeather}
      className={cn(
        "mt-1.5 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
        showWeather ? "border-transparent bg-secondary text-secondary-foreground" : "border-border bg-white/60 text-muted-foreground"
      )}
    >
      <CloudSun size={13} />
      Weather
    </button>
  );
}

/** Floating filter panel on desktop; collapses to a pill + bottom sheet on mobile. */
export function FilterPanel(props: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = props.visibleKinds.size;

  return (
    <>
      {/* Desktop floating panel */}
      <div className="absolute left-3 top-3 z-[1000] hidden w-52 rounded-2xl border border-white/60 bg-white/85 p-3 shadow-soft backdrop-blur-md lg:block">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
          <SlidersHorizontal size={12} />
          Filters
        </p>
        <FilterChips visibleKinds={props.visibleKinds} onToggleKind={props.onToggleKind} counts={props.counts} />
        <div className="mt-2 border-t border-border pt-2">
          <HeatmapToggle showHeatmap={props.showHeatmap} onToggleHeatmap={props.onToggleHeatmap} />
          <WeatherToggle showWeather={props.showWeather} onToggleWeather={props.onToggleWeather} />
        </div>
      </div>

      {/* Mobile trigger pill */}
      <button
        onClick={() => setMobileOpen(true)}
        className="absolute left-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/90 px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur-md lg:hidden"
      >
        <SlidersHorizontal size={13} />
        Filters ({activeCount})
      </button>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[1400] bg-black/30 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[1500] max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 shadow-2xl lg:hidden"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Map Filters</p>
                <button onClick={() => setMobileOpen(false)} aria-label="Close">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>
              <FilterChips visibleKinds={props.visibleKinds} onToggleKind={props.onToggleKind} counts={props.counts} />
              <div className="mt-2 border-t border-border pt-2">
                <HeatmapToggle showHeatmap={props.showHeatmap} onToggleHeatmap={props.onToggleHeatmap} />
                <WeatherToggle showWeather={props.showWeather} onToggleWeather={props.onToggleWeather} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
