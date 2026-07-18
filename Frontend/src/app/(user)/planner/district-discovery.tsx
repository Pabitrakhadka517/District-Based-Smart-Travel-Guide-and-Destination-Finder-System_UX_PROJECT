"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, X, Sparkles, MapPin, Mountain, Landmark, PartyPopper,
  BookOpen, Clock, ArrowRight,
} from "lucide-react";
import type {
  Destination, TouristAttraction, Trek, Festival, GuideArticle, District,
  Category, AttractionCategory, Difficulty,
} from "@/types";
import { useDistrictFull } from "@/hooks/use-content";
import { DestinationCard } from "@/components/cards/destination-card";
import { AttractionCard } from "@/components/cards/attraction-card";
import { TrekCard } from "@/components/cards/trek-card";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FESTIVAL_TYPE_STYLE } from "@/lib/category-colors";
import { buildDistrictRecommendations, type DiscoveryItem } from "./district-recommendations";

type Tab = "recommended" | "destination" | "attraction" | "trek" | "festival" | "guide";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "recommended", label: "Recommended", icon: Sparkles },
  { id: "destination", label: "Destinations", icon: MapPin },
  { id: "attraction",  label: "Attractions",  icon: Landmark },
  { id: "trek",        label: "Treks",        icon: Mountain },
  { id: "festival",    label: "Festivals",    icon: PartyPopper },
  { id: "guide",       label: "Guides",       icon: BookOpen },
];

export interface DistrictSelection {
  destinationIds: string[];
  attractionIds: string[];
  trekIds: string[];
}

interface Props {
  districtSlug: string;
  selection: DistrictSelection;
  onToggle: (kind: "destination" | "attraction" | "trek", id: string) => void;
}

/** Steps 2 & 3 of the guided Trip Planner: browse everything available in the
 *  chosen district (every stored place, not just featured ones) and heuristic
 *  "smart recommendation" buckets built from that same data. */
export function DistrictDiscovery({ districtSlug, selection, onToggle }: Props) {
  const { data, isLoading, error } = useDistrictFull(districtSlug);
  const [tab, setTab] = useState<Tab>("recommended");

  const isSelected = (kind: "destination" | "attraction" | "trek", id: string) => {
    if (kind === "destination") return selection.destinationIds.includes(id);
    if (kind === "attraction") return selection.attractionIds.includes(id);
    return selection.trekIds.includes(id);
  };

  const recommendations = useMemo(() => (data ? buildDistrictRecommendations(data) : []), [data]);

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <EmptyState icon={MapPin} title="Couldn't load this district" description="Please try again in a moment." />;
  }

  const selectedCount =
    selection.destinationIds.length + selection.attractionIds.length +
    selection.trekIds.length;

  return (
    <div className="space-y-5">
      {/* District header */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-soft">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          <CloudinaryImage image={data.district.heroImage} alt={data.district.name} fill className="object-cover" sizes="64px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-brand-600">{data.district.name} District</p>
          <p className="text-xs text-muted-foreground">
            {data.counts.destinationCount} destinations · {data.counts.attractionCount} attractions ·{" "}
            {data.treks.length} treks · {data.festivals.length} festivals
          </p>
        </div>
        {selectedCount > 0 && (
          <Badge variant="success" className="shrink-0">{selectedCount} selected</Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted p-1 scrollbar-hide">
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TabIcon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "recommended" && (
        <RecommendedTab
          buckets={recommendations}
          isSelected={isSelected}
          onToggle={onToggle}
          nearbyDistricts={data.nearbyDistricts}
        />
      )}
      {tab === "destination" && (
        <DestinationsTab
          destinations={data.destinations}
          selectedIds={selection.destinationIds}
          onToggle={(id) => onToggle("destination", id)}
        />
      )}
      {tab === "attraction" && (
        <AttractionsTab
          attractions={data.attractions}
          selectedIds={selection.attractionIds}
          onToggle={(id) => onToggle("attraction", id)}
        />
      )}
      {tab === "trek" && (
        <TreksTab
          treks={data.treks}
          selectedIds={selection.trekIds}
          onToggle={(id) => onToggle("trek", id)}
        />
      )}
      {tab === "festival" && <FestivalsTab festivals={data.festivals} />}
      {tab === "guide" && <GuidesTab guides={data.guides} />}
    </div>
  );
}

/* ---- Recommended ---- */

function DiscoveryCard({ item, selected, onToggle }: { item: DiscoveryItem; selected: boolean; onToggle: () => void }) {
  if (item.kind === "destination") return <DestinationCard destination={item.item} selected={selected} onToggleSelect={onToggle} />;
  if (item.kind === "attraction") return <AttractionCard attraction={item.item} selected={selected} onToggleSelect={onToggle} />;
  if (item.kind === "trek") return <TrekCard trek={item.item} selected={selected} onToggleSelect={onToggle} />;
  // Festivals are informational only here — not addable to the trip.
  return <FestivalMiniCard festival={item.item} />;
}

function RecommendedTab({
  buckets, isSelected, onToggle, nearbyDistricts,
}: {
  buckets: ReturnType<typeof buildDistrictRecommendations>;
  isSelected: (kind: "destination" | "attraction" | "trek", id: string) => boolean;
  onToggle: (kind: "destination" | "attraction" | "trek", id: string) => void;
  nearbyDistricts: District[];
}) {
  if (buckets.length === 0 && nearbyDistricts.length === 0) {
    return <EmptyState icon={Sparkles} title="No recommendations yet" description="Browse the tabs above instead — everything in this district is listed there." />;
  }

  return (
    <div className="space-y-8">
      {buckets.map((bucket) => (
        <section key={bucket.key}>
          <div className="mb-3">
            <h3 className="font-display text-lg font-semibold text-brand-600">{bucket.label}</h3>
            <p className="text-xs text-muted-foreground">{bucket.description}</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {bucket.items.map((item) => (
              <div key={`${item.kind}-${item.item.id}`} className="w-72 shrink-0">
                <DiscoveryCard
                  item={item}
                  selected={item.kind !== "festival" && isSelected(item.kind, item.item.id)}
                  onToggle={() => { if (item.kind !== "festival") onToggle(item.kind, item.item.id); }}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {nearbyDistricts.length > 0 && (
        <section>
          <div className="mb-3">
            <h3 className="font-display text-lg font-semibold text-brand-600">Nearby Places</h3>
            <p className="text-xs text-muted-foreground">Other districts in the same province, in case your trip stretches further.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {nearbyDistricts.map((d) => (
              <Link
                key={d.id}
                href={`/districts/${d.slug}`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 text-sm text-foreground transition hover:border-brand-600 hover:text-brand-600"
              >
                <MapPin size={13} /> {d.name} <ArrowRight size={12} className="opacity-50" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---- shared search+filter bar ---- */

function SearchFilterBar({
  search, onSearchChange, placeholder,
}: { search: string; onSearchChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
      />
      {search && (
        <button onClick={() => onSearchChange("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function FilterChips<T extends string>({ options, active, onChange, counts }: {
  options: readonly T[]; active: T | "All"; onChange: (v: T | "All") => void; counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onChange("All")}
        className={cn(
          "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
          active === "All" ? "bg-brand-600 text-white shadow-sm" : "border border-border bg-white text-muted-foreground hover:border-brand-600 hover:text-brand-600"
        )}
      >
        All ({Object.values(counts).reduce((s, n) => s + n, 0)})
      </button>
      {options.filter((o) => counts[o] > 0).map((o) => (
        <button
          key={o}
          onClick={() => onChange(active === o ? "All" : o)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
            active === o ? "bg-brand-600 text-white shadow-sm" : "border border-border bg-white text-muted-foreground hover:border-brand-600 hover:text-brand-600"
          )}
        >
          {o} ({counts[o] ?? 0})
        </button>
      ))}
    </div>
  );
}

/* ---- Destinations ---- */

const DEST_CATEGORIES: Category[] = ["Heritage", "Adventure", "Nature", "Trekking", "Religious", "Wildlife", "Cultural", "Lake", "City"];

function DestinationsTab({ destinations, selectedIds, onToggle }: { destinations: Destination[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of destinations) c[d.category] = (c[d.category] ?? 0) + 1;
    return c;
  }, [destinations]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return destinations.filter((d) => {
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.tagline.toLowerCase().includes(q);
      const matchCat = category === "All" || d.category === category;
      return matchSearch && matchCat;
    });
  }, [destinations, search, category]);

  if (destinations.length === 0) {
    return <EmptyState icon={MapPin} title="No destinations here yet" description="Check back later, or browse another district." />;
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search destinations…" />
      <FilterChips options={DEST_CATEGORIES} active={category} onChange={setCategory} counts={counts} />
      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="No destinations found" description="Try a different search or category." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DestinationCard key={d.id} destination={d} selected={selectedIds.includes(d.id)} onToggleSelect={() => onToggle(d.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Attractions ---- */

const ATTRACTION_CATEGORIES: AttractionCategory[] = [
  "Religious Sites", "Historical Sites", "Natural Attractions", "Lakes & Rivers",
  "Mountains & Trekking Routes", "Adventure Activities", "Cultural Heritage Sites",
  "Viewpoints", "National Parks & Wildlife", "Local Experiences",
];

function AttractionsTab({ attractions, selectedIds, onToggle }: { attractions: TouristAttraction[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AttractionCategory | "All">("All");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of attractions) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [attractions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return attractions.filter((a) => {
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q);
      const matchCat = category === "All" || a.category === category;
      return matchSearch && matchCat;
    });
  }, [attractions, search, category]);

  if (attractions.length === 0) {
    return <EmptyState icon={Landmark} title="No attractions here yet" description="Check back later, or browse another district." />;
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search attractions…" />
      <FilterChips options={ATTRACTION_CATEGORIES} active={category} onChange={setCategory} counts={counts} />
      {filtered.length === 0 ? (
        <EmptyState icon={Landmark} title="No attractions found" description="Try a different search or category." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <AttractionCard key={a.id} attraction={a} selected={selectedIds.includes(a.id)} onToggleSelect={() => onToggle(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Treks ---- */

const DIFFICULTIES: Difficulty[] = ["Easy", "Moderate", "Challenging", "Strenuous"];

function TreksTab({ treks, selectedIds, onToggle }: { treks: Trek[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "All">("All");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of treks) c[t.difficulty] = (c[t.difficulty] ?? 0) + 1;
    return c;
  }, [treks]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return treks.filter((t) => {
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q);
      const matchDiff = difficulty === "All" || t.difficulty === difficulty;
      return matchSearch && matchDiff;
    });
  }, [treks, search, difficulty]);

  if (treks.length === 0) {
    return <EmptyState icon={Mountain} title="No treks here yet" description="Check back later, or browse another district." />;
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search treks…" />
      <FilterChips options={DIFFICULTIES} active={difficulty} onChange={setDifficulty} counts={counts} />
      {filtered.length === 0 ? (
        <EmptyState icon={Mountain} title="No treks found" description="Try a different search or difficulty." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TrekCard key={t.id} trek={t} selected={selectedIds.includes(t.id)} onToggleSelect={() => onToggle(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Festivals ---- */

const FESTIVAL_TYPES = ["Religious", "Cultural", "Harvest", "National"] as const;

/** Festivals are informational only — dates/seasons rarely line up neatly
 *  with a specific itinerary day, so they're surfaced for awareness (e.g.
 *  "Dashain falls during your trip") rather than added as a visit stop. */
function FestivalsTab({ festivals }: { festivals: Festival[] }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<(typeof FESTIVAL_TYPES)[number] | "All">("All");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of festivals) c[f.type] = (c[f.type] ?? 0) + 1;
    return c;
  }, [festivals]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return festivals.filter((f) => {
      const matchSearch = !q || f.name.toLowerCase().includes(q) || f.where.toLowerCase().includes(q);
      const matchType = type === "All" || f.type === type;
      return matchSearch && matchType;
    });
  }, [festivals, search, type]);

  if (festivals.length === 0) {
    return <EmptyState icon={PartyPopper} title="No festivals here yet" description="Check back later, or browse another district." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">For your awareness — festivals aren&apos;t added to your itinerary, they just open in a new tab.</p>
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search festivals…" />
      <FilterChips options={FESTIVAL_TYPES} active={type} onChange={setType} counts={counts} />
      {filtered.length === 0 ? (
        <EmptyState icon={PartyPopper} title="No festivals found" description="Try a different search or type." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <FestivalMiniCard key={f.id} festival={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function FestivalMiniCard({ festival: f }: { festival: Festival }) {
  return (
    <Link
      href={`/festivals/${f.slug}`}
      target="_blank"
      className="group relative block overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft transition card-hover"
    >
      <div className="relative h-40 overflow-hidden">
        <CloudinaryImage image={f.image} alt={f.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <span className={cn("absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-medium", FESTIVAL_TYPE_STYLE[f.type])}>{f.type}</span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold text-brand-600 group-hover:text-secondary">{f.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock size={12} /> {f.month || f.season}</p>
      </div>
    </Link>
  );
}

/* ---- Guides (read-only) ---- */

function GuidesTab({ guides }: { guides: GuideArticle[] }) {
  if (guides.length === 0) {
    return <EmptyState icon={BookOpen} title="No guides for this district yet" description="Check back later." />;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">Read before you go — guides aren&apos;t added to your itinerary, they just open in a new tab.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <button
            key={g.id}
            onClick={() => window.open(`/guides/${g.slug}`, "_blank")}
            className={cn("group flex gap-3 rounded-2xl border p-3 text-left shadow-soft transition hover:border-brand-300", "border-border bg-white")}
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
              <CloudinaryImage image={g.cover} alt={g.title} fill className="object-cover" sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-brand-600 group-hover:text-secondary">{g.title}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={11} /> {g.readMinutes} min read
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
