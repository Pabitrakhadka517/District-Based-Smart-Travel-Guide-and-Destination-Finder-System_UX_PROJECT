"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Search, X } from "lucide-react";
import type { Destination, TouristAttraction, Trek, Festival, GuideArticle } from "@/types";
import { useDestinations, useAttractions, useTreks, useFestivals, useGuides, useDistricts } from "@/hooks/use-content";
import {
  type MapEntry, type MapKind, entryId, entriesMatch, entryCoordinates, entryName,
} from "@/lib/map-entry-helpers";
import { FilterPanel } from "@/components/maps/filter-panel";
import { MapSearchBar, type SearchSelection } from "@/components/maps/map-search-bar";
import { QuickViewPanel } from "@/components/maps/quick-view-panel";
import { SidebarSections } from "@/components/maps/sidebar-sections";
import { ItemRow } from "@/components/maps/item-row";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlyToTarget } from "@/components/maps/leaflet/fly-to-controller";
import type { HeatPoint } from "@/components/maps/leaflet/heatmap-layer";
import type { WeatherPoint } from "@/components/maps/leaflet/weather-layer";

const NepalMap = dynamic(
  () => import("@/components/maps/leaflet/nepal-map").then((m) => m.NepalMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

interface Props {
  destinations: Destination[];
  attractions: TouristAttraction[];
  treks: Trek[];
  festivals: Festival[];
  guides: GuideArticle[];
}

const ALL_KINDS: MapKind[] = ["destination", "attraction", "trek", "festival", "guide"];

export function MapExplorer(props: Props) {
  const { data: destinations = [] } = useDestinations("", props.destinations);
  const { data: attractions = [] } = useAttractions("", props.attractions);
  const { data: treks = [] } = useTreks("", props.treks);
  const { data: festivals = [] } = useFestivals(props.festivals);
  const { data: guides = [] } = useGuides("", props.guides);
  const { data: districts = [] } = useDistricts();

  const districtsById = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);

  const [visibleKinds, setVisibleKinds] = useState<Set<MapKind>>(new Set(ALL_KINDS));
  const [sidebarView, setSidebarView] = useState<MapKind | null>(null);
  const [selected, setSelected] = useState<MapEntry | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [search, setSearch] = useState("");

  const allEntries = useMemo<MapEntry[]>(() => [
    ...destinations.map((d): MapEntry => ({ kind: "destination", data: d })),
    ...attractions.map((a): MapEntry => ({ kind: "attraction", data: a })),
    ...treks.map((t): MapEntry => ({ kind: "trek", data: t })),
    ...festivals.map((f): MapEntry => ({ kind: "festival", data: f })),
    ...guides.map((g): MapEntry => ({ kind: "guide", data: g })),
  ], [destinations, attractions, treks, festivals, guides]);

  const counts = useMemo(() => {
    const c: Record<MapKind, number> = { destination: 0, attraction: 0, trek: 0, festival: 0, guide: 0 };
    for (const e of allEntries) c[e.kind]++;
    return c;
  }, [allEntries]);

  /* Markers shown on the map — governed only by the filter panel's visibleKinds. */
  const visibleEntries = useMemo(() => allEntries.filter((e) => visibleKinds.has(e.kind)), [allEntries, visibleKinds]);

  /* Sidebar flat list — governed by visibleKinds + an optional single-kind drill-down + text search. */
  const flatListEntries = useMemo(() => {
    let list = visibleEntries;
    if (sidebarView) list = list.filter((e) => e.kind === sidebarView);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => entryName(e).toLowerCase().includes(q));
    }
    return list;
  }, [visibleEntries, sidebarView, search]);

  const showCuratedSections = !sidebarView && !search.trim();

  function toggleKind(kind: MapKind) {
    setVisibleKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function handleSearchSelect(selection: SearchSelection) {
    if (selection.type === "district") {
      setFlyToTarget({
        id: `district-${selection.district.id}`,
        lat: selection.district.coordinates.lat,
        lng: selection.district.coordinates.lng,
        zoom: 10,
      });
      setSelected(null);
      return;
    }
    const { entry } = selection;
    const { lat, lng } = entryCoordinates(entry);
    setFlyToTarget({ id: entryId(entry), lat, lng, zoom: 14 });
    setSelected(entry);
    setVisibleKinds((prev) => new Set([...prev, entry.kind]));
  }

  function handleSeeAll(kind: MapKind) {
    setSidebarView(kind);
    setSelected(null);
  }

  /* Heatmap intensity: destination/attraction weighted by rating*log(reviewCount+1); trek by
   * rating alone (no reviewCount field); festival/guide get a flat placeholder — neither model
   * carries any numeric popularity signal, even after this change. */
  const heatPoints = useMemo<HeatPoint[]>(() => {
    const raw = visibleEntries.map((e) => {
      const { lat, lng } = entryCoordinates(e);
      let weight: number;
      if (e.kind === "destination" || e.kind === "attraction") weight = e.data.rating * Math.log(e.data.reviewCount + 1);
      else if (e.kind === "trek") weight = e.data.rating || 1;
      else weight = 2;
      return { lat, lng, weight };
    });
    const max = Math.max(...raw.map((p) => p.weight), 1);
    return raw.map((p) => ({ lat: p.lat, lng: p.lng, intensity: p.weight / max }));
  }, [visibleEntries]);

  /* Per-province destination counts, joined client-side from already-fetched destinations + districts. */
  const provinceCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const d of destinations) {
      const province = districtsById.get(d.districtId)?.province;
      if (!province) continue;
      result[province] = (result[province] ?? 0) + 1;
    }
    return result;
  }, [destinations, districtsById]);

  /* One weather point per province — its districts' coordinate centroid —
   * rather than one per marker, which would mean hundreds of Open-Meteo calls. */
  const weatherPoints = useMemo<WeatherPoint[]>(() => {
    const groups: Record<string, { latSum: number; lngSum: number; count: number }> = {};
    for (const d of districts) {
      const g = groups[d.province] ?? (groups[d.province] = { latSum: 0, lngSum: 0, count: 0 });
      g.latSum += d.coordinates.lat;
      g.lngSum += d.coordinates.lng;
      g.count++;
    }
    return Object.entries(groups).map(([province, g]) => ({
      id: province,
      lat: g.latSum / g.count,
      lng: g.lngSum / g.count,
      label: province,
    }));
  }, [districts]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Page header — unchanged */}
      <div className="border-b border-border bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-2xl font-bold text-brand-600 sm:text-3xl">Explore Nepal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allEntries.length} places to discover — destinations, attractions, treks, festivals, and travel guides
          </p>
        </div>
      </div>

      {/* Main layout — same two-column structure as before */}
      <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">

          {/* Map */}
          <div className="relative w-full overflow-hidden rounded-2xl border border-border shadow-soft lg:flex-1 h-[340px] sm:h-[480px] lg:h-[calc(100vh-16rem)]">
            <NepalMap
              entries={visibleEntries}
              districtsById={districtsById}
              onSelect={setSelected}
              flyToTarget={flyToTarget}
              provinceCounts={provinceCounts}
              heatPoints={heatPoints}
              showHeatmap={showHeatmap}
              weatherPoints={weatherPoints}
              showWeather={showWeather}
            />
            <FilterPanel
              visibleKinds={visibleKinds}
              onToggleKind={toggleKind}
              counts={counts}
              showHeatmap={showHeatmap}
              onToggleHeatmap={() => setShowHeatmap((v) => !v)}
              showWeather={showWeather}
              onToggleWeather={() => setShowWeather((v) => !v)}
            />
            <MapSearchBar onSelect={handleSearchSelect} />
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col lg:w-80 xl:w-96 lg:max-h-[calc(100vh-14rem)] lg:overflow-hidden">
            {selected ? (
              <div className="flex flex-col lg:max-h-full lg:overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-soft">
                <QuickViewPanel entry={selected} districtsById={districtsById} onBack={() => setSelected(null)} />
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative mb-3">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search places, regions, guides…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {showCuratedSections ? (
                  <div className="lg:max-h-full lg:overflow-y-auto pr-0.5">
                    <SidebarSections
                      destinations={destinations}
                      attractions={attractions}
                      treks={treks}
                      festivals={festivals}
                      selected={selected}
                      onSelect={setSelected}
                      onSeeAll={handleSeeAll}
                    />
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {flatListEntries.length} result{flatListEntries.length !== 1 ? "s" : ""}
                        {search && ` for "${search}"`}
                      </p>
                      {sidebarView && !search && (
                        <button onClick={() => setSidebarView(null)} className="text-[11px] font-medium text-secondary hover:underline">
                          ← All categories
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 lg:max-h-full lg:overflow-y-auto pr-0.5">
                      {flatListEntries.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center">
                          <Search size={24} className="mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm font-medium text-muted-foreground">No results found</p>
                          <p className="mt-1 text-xs text-muted-foreground">Try a different search or filter</p>
                        </div>
                      ) : (
                        flatListEntries.map((entry) => (
                          <ItemRow
                            key={`${entry.kind}-${entryId(entry)}`}
                            entry={entry}
                            isSelected={entriesMatch(selected, entry)}
                            onClick={() => setSelected(entry)}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
