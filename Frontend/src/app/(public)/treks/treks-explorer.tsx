"use client";
import { useMemo, useState } from "react";
import { Tent } from "lucide-react";
import type { Trek, Difficulty } from "@/types";
import { TrekCard } from "@/components/cards/trek-card";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

const DIFFS: (Difficulty | "All")[] = ["All", "Easy", "Moderate", "Challenging", "Strenuous"];

export function TreksExplorer({ treks }: { treks: Trek[] }) {
  const [diff, setDiff] = useState<Difficulty | "All">("All");
  const [sort, setSort] = useState("rating");
  const list = useMemo(() => {
    let r = treks.filter((t) => diff === "All" || t.difficulty === diff);
    if (sort === "rating") r = [...r].sort((a, b) => b.rating - a.rating);
    if (sort === "duration") r = [...r].sort((a, b) => a.durationDays - b.durationDays);
    if (sort === "altitude") r = [...r].sort((a, b) => b.maxAltitude - a.maxAltitude);
    if (sort === "price") r = [...r].sort((a, b) => a.priceFrom - b.priceFrom);
    return r;
  }, [treks, diff, sort]);

  return (
    <section className="section">
      <SectionHeader eyebrow="Choose your route" title={`${list.length} trekking routes`}
        action={
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-xl border border-border px-3 text-sm">
            <option value="rating">Top rated</option>
            <option value="duration">Shortest first</option>
            <option value="altitude">Highest first</option>
            <option value="price">Lowest price</option>
          </select>
        } />
      <div className="mb-8 flex flex-wrap gap-2">
        {DIFFS.map((d) => (
          <button key={d} onClick={() => setDiff(d)} aria-pressed={diff === d}>
            <Badge variant={diff === d ? "accent" : "outline"} className={cn("cursor-pointer px-3 py-1", diff === d && "bg-accent text-accent-foreground")}>{d}</Badge>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={Tent}
          title="No treks match that difficulty"
          description="Try a different difficulty level to see more routes."
          action={{ label: "Show all treks", onClick: () => setDiff("All") }}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => <TrekCard key={t.id} trek={t} />)}
        </div>
      )}
    </section>
  );
}
