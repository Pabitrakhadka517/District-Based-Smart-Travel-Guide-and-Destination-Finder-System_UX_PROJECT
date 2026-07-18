"use client";
import { useMemo } from "react";
import {
  MapPin, Landmark, Mountain, Users, CalendarDays,
  Wallet, Hotel, Bus, FileText, Bed, UtensilsCrossed, Ticket, MoreHorizontal,
} from "lucide-react";
import { useDistrictFull } from "@/hooks/use-content";
import { MapWidget, type MapMarker } from "@/components/maps/map-widget";
import { EmptyState } from "@/components/shared/empty-state";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn, formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORY_STYLE } from "@/lib/category-colors";
import { dateRange, fmtDay } from "./planner-utils";
import type { TripPlan } from "@/types";

interface Props {
  plan: TripPlan;
  districtSlug: string;
}

/** Step 5 of the guided Trip Planner: a single review screen pulling
 *  together everything selected in Steps 1-4, plus a map — the gate before
 *  booking. Purely a read-only summary; edits happen in the other tabs. */
export function TripSummary({ plan, districtSlug }: Props) {
  const { data, isLoading } = useDistrictFull(districtSlug);

  const destinations = useMemo(
    () => (data?.destinations ?? []).filter((d) => plan.destinationIds.includes(d.id)),
    [data, plan.destinationIds]
  );
  const attractions = useMemo(
    () => (data?.attractions ?? []).filter((a) => plan.attractionIds.includes(a.id)),
    [data, plan.attractionIds]
  );
  const treks = useMemo(
    () => (data?.treks ?? []).filter((t) => plan.trekIds.includes(t.id)),
    [data, plan.trekIds]
  );

  const markers: MapMarker[] = useMemo(() => [
    ...destinations.map((d): MapMarker => ({ id: d.id, name: d.name, lat: d.coordinates.lat, lng: d.coordinates.lng, type: "destination" })),
    ...attractions.map((a): MapMarker => ({ id: a.id, name: a.name, lat: a.coordinates.lat, lng: a.coordinates.lng, type: "attraction" })),
    ...treks.map((t): MapMarker => ({ id: t.id, name: t.name, lat: t.coordinates.lat, lng: t.coordinates.lng, type: "trek" })),
  ], [destinations, attractions, treks]);

  // Walks the day-by-day itinerary in order and pulls out each stop the
  // first time it's visited, so the map draws the trip's actual planned
  // route rather than just a flat destinations-then-attractions-then-treks
  // grouping. Anything selected but not yet placed into a day (or the
  // itinerary hasn't been built yet) is appended at the end, so nothing
  // selected ever silently disappears from the map.
  const routeMarkers: MapMarker[] = useMemo(() => {
    const byKey = new Map(markers.map((m) => [`${m.type}:${m.id}`, m]));
    const seen = new Set<string>();
    const ordered: MapMarker[] = [];

    const sortedDays = [...(plan.itinerary ?? [])].sort((a, b) => a.day - b.day);
    for (const day of sortedDays) {
      for (const act of day.activities) {
        if (act.type === "custom") continue;
        const key = `${act.type}:${act.destinationId}`;
        if (seen.has(key)) continue;
        const marker = byKey.get(key);
        if (!marker) continue;
        seen.add(key);
        ordered.push(marker);
      }
    }
    for (const m of markers) {
      const key = `${m.type}:${m.id}`;
      if (!seen.has(key)) ordered.push(m);
    }
    return ordered;
  }, [plan.itinerary, markers]);

  const days = dateRange(plan.startDate, plan.endDate).length;
  const totalPlaces = destinations.length + attractions.length + treks.length;
  const spentBreakdown = Object.entries(plan.budgetBreakdown ?? {}) as [keyof typeof EXPENSE_CATEGORY_STYLE, number][];
  const spentTotal = spentBreakdown.reduce((s, [, v]) => s + (v ?? 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (totalPlaces === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Nothing selected yet"
        description="Head over to the Discover tab and add a few places before reviewing your trip."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <p className="font-display text-lg font-bold text-brand-600">{data?.district.name} District</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat icon={CalendarDays} label="Duration" value={days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : "Not set"} />
          <SummaryStat icon={Users} label="Travellers" value={String(plan.travelers ?? 1)} />
          <SummaryStat icon={MapPin} label="Places" value={String(totalPlaces)} />
          <SummaryStat icon={Wallet} label="Budget" value={plan.budget > 0 ? formatCurrency(plan.budget) : "Not set"} />
        </div>
        {(plan.startDate || plan.endDate) && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays size={13} />
            {plan.startDate && fmtDay(plan.startDate)}
            {plan.startDate && plan.endDate && " → "}
            {plan.endDate && fmtDay(plan.endDate)}
          </p>
        )}
      </div>

      {/* Map — route line reflects the actual day-by-day visiting order from the Itinerary tab */}
      <MapWidget markers={routeMarkers} height="h-80" route />
      {routeMarkers.length > 1 && (
        <p className="-mt-2.5 text-center text-xs text-muted-foreground">
          Numbered stops follow your itinerary&rsquo;s planned order.
        </p>
      )}

      {/* Selected places, grouped by type */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PlaceList icon={MapPin} label="Destinations" items={destinations.map((d) => ({ id: d.id, name: d.name, image: d.heroImage }))} />
        <PlaceList icon={Landmark} label="Attractions" items={attractions.map((a) => ({ id: a.id, name: a.name, image: a.heroImage }))} />
        <PlaceList icon={Mountain} label="Treks" items={treks.map((t) => ({ id: t.id, name: t.name, image: t.heroImage }))} />
      </div>

      {/* Preferences */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Hotel size={14} /> Accommodation</p>
          <p className="mt-1 text-sm text-muted-foreground">{plan.accommodationPreference}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Bus size={14} /> Transport</p>
          <p className="mt-1 text-sm text-muted-foreground">{plan.transportPreference}</p>
        </div>
      </div>

      {/* Budget breakdown (read-only) */}
      {spentTotal > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Wallet size={14} /> Estimated expenses</p>
          <div className="mt-3 space-y-2.5">
            {spentBreakdown.filter(([, v]) => (v ?? 0) > 0).map(([key, value]) => {
              const cfg = EXPENSE_CATEGORY_STYLE[key];
              const Icon = { accommodation: Bed, food: UtensilsCrossed, transportation: Bus, activities: Ticket, other: MoreHorizontal }[key];
              const pct = spentTotal > 0 ? Math.round((value / spentTotal) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("flex items-center gap-1.5 font-medium capitalize", cfg.text)}><Icon size={12} /> {key}</span>
                    <span className="text-muted-foreground">{formatCurrency(value)} ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", cfg.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {plan.notes && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><FileText size={14} /> Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{plan.notes}</p>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon size={12} /> {label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PlaceList({ icon: Icon, label, items }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  items: { id: string; name: string; image: { url: string; publicId: string | null; alt: string } }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon size={14} /> {label} <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
              <CloudinaryImage image={item.image} alt={item.name} fill className="object-cover" sizes="32px" />
            </div>
            <span className="truncate text-sm text-foreground">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
