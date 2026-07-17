"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowLeft, Save, Trash2, Loader2, ChevronDown,
  CalendarDays, CheckSquare, Wallet, MapPin, FileText,
  Search, X, Cloud, Star, CheckCircle, Users, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn } from "@/lib/utils";
import {
  useUpdatePlan, useDeletePlan, useDestinations,
  useTrendingRecommendations, useWeather,
} from "@/hooks/use-content";
import { WeatherCard } from "@/components/cards/weather-card";
import type {
  TripPlan, TripDay, ChecklistItem, BudgetBreakdown, Destination,
} from "@/types";
import { TRAVEL_TYPE_CONFIG, STATUS_STYLE, dateRange, fmtDay } from "./planner-utils";
import { ItineraryBuilder } from "./itinerary-builder";
import { TripChecklist } from "./trip-checklist";
import { BudgetPlanner } from "./budget-planner";

interface Props {
  plan: TripPlan;
  onBack: () => void;
  onUpdate: (plan: TripPlan) => void;
}

type Tab = "itinerary" | "destinations" | "checklist" | "budget" | "weather" | "notes";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "itinerary",    label: "Itinerary",    icon: CalendarDays },
  { id: "destinations", label: "Destinations", icon: MapPin        },
  { id: "checklist",    label: "Checklist",    icon: CheckSquare   },
  { id: "budget",       label: "Budget",       icon: Wallet    },
  { id: "weather",      label: "Weather",      icon: Cloud         },
  { id: "notes",        label: "Notes",        icon: FileText      },
];

const STATUS_OPTIONS = ["draft", "planned", "ready"] as const;

export function TripWorkspace({ plan, onBack, onUpdate }: Props) {
  const [local, setLocal]             = useState<TripPlan>({ ...plan });
  const [tab, setTab]                 = useState<Tab>("itinerary");
  const [dirty, setDirty]             = useState(false);
  const [savedFlash, setSavedFlash]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const { data: allDestinations = [] } = useDestinations();

  const tripDestinations = allDestinations.filter((d) => local.destinationIds.includes(d.id));
  const availableToAdd   = allDestinations.filter((d) => !local.destinationIds.includes(d.id));

  /* Derived trip stats */
  const tripDays =
    local.startDate && local.endDate
      ? Math.max(1, dateRange(local.startDate, local.endDate).length)
      : 0;

  const patch = useCallback(<K extends keyof TripPlan>(key: K, val: TripPlan[K]) => {
    setLocal((p) => ({ ...p, [key]: val }));
    setDirty(true);
  }, []);

  const addDestination    = (id: string) => patch("destinationIds", [...local.destinationIds, id]);
  const removeDestination = (id: string) => patch("destinationIds", local.destinationIds.filter((x) => x !== id));

  const handleSave = useCallback(async () => {
    if (updatePlan.isPending) return;
    const updated = await updatePlan.mutateAsync(local);
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    onUpdate(updated);
  }, [local, updatePlan, onUpdate]);

  /* Auto-save: 3s debounce after last change */
  useEffect(() => {
    if (!dirty) return;
    const id = setTimeout(handleSave, 3000);
    return () => clearTimeout(id);
  }, [dirty, handleSave]);

  /* Ctrl+S / Cmd+S keyboard shortcut */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  const handleDelete = async () => {
    await deletePlan.mutateAsync(local.id);
    onBack();
  };

  const cfg    = TRAVEL_TYPE_CONFIG[local.travelType] ?? TRAVEL_TYPE_CONFIG.Adventure;
  const Icon   = cfg.icon;
  const status = STATUS_STYLE[local.status] ?? STATUS_STYLE.planned;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft size={15} /> All trips
        </button>
        <div className="mx-2 h-5 w-px bg-border" />
        <div className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5", cfg.bg)}>
          <Icon size={15} className={cfg.color} />
          <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {savedFlash && !dirty && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle size={12} /> Saved
            </span>
          )}
          {dirty && !updatePlan.isPending && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <Button
            variant="accent"
            size="sm"
            title="Save (Ctrl+S)"
            disabled={updatePlan.isPending}
            onClick={handleSave}
          >
            {updatePlan.isPending ? (
              <><Loader2 size={13} className="animate-spin" /> Saving…</>
            ) : (
              <><Save size={13} /> Save</>
            )}
          </Button>
        </div>
      </div>

      {/* Title + status + trip meta */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={local.title}
            onChange={(e) => patch("title", e.target.value)}
            className="flex-1 font-display text-xl font-bold border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
          />
          {local.status === "completed" || local.status === "ongoing" ? (
            // Once a trip is underway or finished, its status is driven by the
            // Tracking page ("Start trip" / "Mark complete"), not this form —
            // showing an editable draft/planned/ready dropdown here would lie
            // about the trip's real status and (for "completed") the server
            // rejects the change anyway.
            <span
              title={local.status === "completed" ? "Completed trips can't change status here — see Tracking" : "Trip is in progress — managed from Tracking"}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", status.badge)}
            >
              {STATUS_STYLE[local.status].label}
            </span>
          ) : (
            <div className="relative">
              <select
                value={local.status}
                onChange={(e) => patch("status", e.target.value as TripPlan["status"])}
                className={cn(
                  "appearance-none rounded-full border px-3 py-1.5 pr-7 text-xs font-medium outline-none cursor-pointer",
                  status.badge
                )}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60" />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {(local.startDate || local.endDate) && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} />
              {local.startDate && fmtDay(local.startDate)}
              {local.startDate && local.endDate && " → "}
              {local.endDate && fmtDay(local.endDate)}
            </span>
          )}
          {tripDays > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {tripDays} {tripDays === 1 ? "day" : "days"}
            </span>
          )}
          {(local.travelers ?? 0) > 0 && (
            <span className="flex items-center gap-1.5">
              <Users size={13} />
              {local.travelers} {local.travelers === 1 ? "traveller" : "travellers"}
            </span>
          )}
          {local.destinationIds.length > 0 && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} />
              {local.destinationIds.length} {local.destinationIds.length === 1 ? "destination" : "destinations"}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted p-1 scrollbar-hide">
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TabIcon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === "itinerary" && (
        <ItineraryBuilder
          plan={local}
          onChange={(days: TripDay[]) => patch("itinerary", days)}
        />
      )}

      {tab === "destinations" && (
        <DestinationsTab
          tripDestinations={tripDestinations}
          available={availableToAdd}
          onAdd={addDestination}
          onRemove={removeDestination}
        />
      )}

      {tab === "checklist" && (
        <TripChecklist
          items={local.checklist ?? []}
          onChange={(items: ChecklistItem[]) => patch("checklist", items)}
        />
      )}

      {tab === "budget" && (
        <BudgetPlanner
          budget={local.budget}
          breakdown={local.budgetBreakdown ?? { accommodation: 0, food: 0, transportation: 0, activities: 0, other: 0 }}
          travelers={local.travelers ?? 1}
          tripDays={tripDays || 1}
          onBudgetChange={(b) => patch("budget", b)}
          onBreakdownChange={(bd: BudgetBreakdown) => patch("budgetBreakdown", bd)}
        />
      )}

      {tab === "weather" && (
        <WeatherTab tripDestinations={tripDestinations} />
      )}

      {tab === "notes" && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <label className="mb-3 block text-sm font-semibold text-foreground">Trip notes</label>
          <textarea
            value={local.notes ?? ""}
            onChange={(e) => patch("notes", e.target.value)}
            rows={12}
            placeholder="Jot down ideas, reminders, accommodation details, visa requirements, emergency contacts…"
            className="w-full resize-y rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Delete zone */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm text-foreground">
              Delete <strong>{local.title}</strong>? This cannot be undone.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={deletePlan.isPending}
              onClick={handleDelete}
              className="border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
            >
              {deletePlan.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Yes, delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition"
          >
            <Trash2 size={14} /> Delete this trip
          </button>
        )}
      </div>
    </div>
  );
}

/* ---- Weather Tab ---- */

function WeatherTab({ tripDestinations }: { tripDestinations: Destination[] }) {
  const coords = tripDestinations[0]?.coordinates ?? { lat: 27.7172, lng: 85.3240 };
  const locationName = tripDestinations[0]?.name ?? "Nepal";

  const { data: weather = [], isLoading } = useWeather(coords.lat, coords.lng);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Cloud size={16} className="text-secondary" />
              7-Day Forecast
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tripDestinations.length === 0
                ? "Add destinations to see local weather"
                : `Weather for ${locationName}`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : weather.length > 0 ? (
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-7">
            {weather.map((day) => (
              <WeatherCard key={day.day} day={day} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Weather data unavailable.</p>
        )}
      </div>

      {tripDestinations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Showing weather for Kathmandu, Nepal. Add destinations to see weather at your travel locations.
        </div>
      )}

      {tripDestinations.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Showing weather for first destination
          </p>
          <div className="flex flex-wrap gap-2">
            {tripDestinations.map((d) => (
              <span
                key={d.id}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {d.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Destinations Tab ---- */

function DestinationsTab({
  tripDestinations,
  available,
  onAdd,
  onRemove,
}: {
  tripDestinations: Destination[];
  available: Destination[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const { data: trending = [] } = useTrendingRecommendations();

  const filtered = query.trim()
    ? available.filter(
        (d) =>
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.category.toLowerCase().includes(query.toLowerCase())
      )
    : available.slice(0, 12);

  const suggestions = trending
    .filter((d) => !tripDestinations.some((t) => t.id === d.id))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Added destinations */}
      {tripDestinations.length > 0 && (
        <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-foreground">
              Added destinations ({tripDestinations.length})
            </p>
          </div>
          <ul className="divide-y divide-border">
            {tripDestinations.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                  <CloudinaryImage image={d.heroImage} alt={d.name} fill className="object-cover" sizes="40px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Star size={11} className="fill-secondary text-secondary" />
                    {d.rating.toFixed(1)}
                  </span>
                  <button
                    onClick={() => onRemove(d.id)}
                    className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search + add */}
      <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations to add…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        {filtered.length > 0 ? (
          <ul className="divide-y divide-border max-h-80 overflow-y-auto">
            {filtered.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl">
                  <CloudinaryImage image={d.heroImage} alt={d.name} fill className="object-cover" sizes="36px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.category}</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => onAdd(d.id)}>
                  + Add
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {query ? "No destinations match your search." : "All destinations already added."}
          </p>
        )}
      </div>

      {/* Trending suggestions */}
      {!query && suggestions.length > 0 && tripDestinations.length === 0 && (
        <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-foreground">Popular in Nepal</p>
            <p className="text-xs text-muted-foreground mt-0.5">Top-rated destinations to inspire your trip</p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            {suggestions.map((d) => (
              <button
                key={d.id}
                onClick={() => onAdd(d.id)}
                className="group relative overflow-hidden rounded-2xl border border-border text-left transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="relative h-24 w-full">
                  <CloudinaryImage image={d.heroImage} alt={d.name} fill className="object-cover transition group-hover:scale-105" sizes="200px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-xs font-semibold text-white truncate">{d.name}</p>
                    <div className="flex items-center gap-1">
                      <Star size={9} className="fill-secondary text-secondary" />
                      <span className="text-[10px] text-white/80">{d.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute right-2 top-2">
                  <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
                    + Add
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
