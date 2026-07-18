"use client";
import { useState, useMemo } from "react";
import { Search, X, Map, Landmark, MapPin, Star, ArrowRight } from "lucide-react";
import type { District } from "@/types";
import { useDistricts } from "@/hooks/use-content";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface Props {
  /** The district already chosen for this plan, if any (re-opening the picker to change it). */
  selectedSlug?: string;
  onSelect: (district: District) => void;
}

/** Step 1 of the guided Trip Planner: pick a province (optional) then a
 *  district — the starting point every following step is scoped to. */
export function DistrictPicker({ selectedSlug, onSelect }: Props) {
  const { data: districts = [], isLoading } = useDistricts();
  const [search, setSearch]     = useState("");
  const [province, setProvince] = useState("All");

  const provinces = useMemo(
    () => ["All", ...Array.from(new Set(districts.map((d) => d.province))).sort()],
    [districts]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return districts.filter((d) => {
      const matchSearch   = !q || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
      const matchProvince = province === "All" || d.province === province;
      return matchSearch && matchProvince;
    });
  }, [districts, search, province]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-brand-600">Where do you want to go?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a district and we&apos;ll show you everything there is to do there.
        </p>
      </div>

      {/* search + province filter */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search all 77 districts by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-white pl-4 pr-24 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search districts"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700"
          >
            <Search size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Map size={14} className="shrink-0 text-muted-foreground" />
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            aria-label="Filter by province"
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
          >
            {provinces.map((p) => (
              <option key={p} value={p}>{p === "All" ? "All provinces" : `${p} Province`}</option>
            ))}
          </select>
        </div>
      </form>

      {/* results count — makes it explicit that every district is here, not a partial list */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {districts.length} districts
          {province !== "All" && <> in <span className="font-medium text-brand-600">{province} Province</span></>}
          {search && <> matching &quot;<span className="font-medium text-brand-600">{search}</span>&quot;</>}
        </p>
      )}

      {/* results */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Map} title="No districts found" description="Try a different name or switch provinces." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DistrictPickerCard key={d.id} district={d} selected={d.slug === selectedSlug} onClick={() => onSelect(d)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DistrictPickerCard({ district: d, selected, onClick }: { district: District; selected: boolean; onClick: () => void }) {
  const attractionCount = d.attractionCount ?? d.destinationCount;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl text-left shadow-soft transition card-hover",
        selected && "ring-2 ring-success ring-offset-2"
      )}
    >
      <div className="relative h-56">
        <CloudinaryImage image={d.heroImage} alt={d.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/25 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white backdrop-blur">{d.province}</Badge>
          <span className="flex items-center gap-1 text-xs text-white/90"><Star size={12} className="fill-accent text-accent" /> {d.rating}</span>
        </div>
        <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{d.name}</h3>
        <div className="mt-3 flex items-center gap-4 text-xs text-white/90">
          <span className="flex items-center gap-1"><Landmark size={13} /> {attractionCount} attractions</span>
          <span className="flex items-center gap-1"><MapPin size={13} /> {d.destinationCount} destinations</span>
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-accent">
            {selected ? "Selected" : "Choose"} <ArrowRight size={14} />
          </span>
        </div>
      </div>
      {selected && (
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-success text-white shadow-soft">
          ✓
        </span>
      )}
    </button>
  );
}
