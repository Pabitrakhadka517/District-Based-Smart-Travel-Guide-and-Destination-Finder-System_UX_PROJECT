"use client";

import Image from "next/image";
import { ChevronRight, Star } from "lucide-react";
import { entryImage, entryName, entryRating, entryDescription, type MapEntry } from "@/lib/map-entry-helpers";
import { KIND_STYLE } from "@/lib/category-colors";
import { cld } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

export function KindChip({ entry }: { entry: MapEntry }) {
  const labels: Record<MapEntry["kind"], string> = {
    destination: "Destination",
    attraction: "Attraction",
    trek: "Trek",
    festival: "Festival",
    guide: "Guide",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", KIND_STYLE[entry.kind])}>
      {labels[entry.kind]}
    </span>
  );
}

export function ItemRow({
  entry, isSelected, onClick, distanceKm,
}: {
  entry: MapEntry;
  isSelected: boolean;
  onClick: () => void;
  /** Distance from the traveller's located position, in km — omitted unless "Sort by distance" is active. */
  distanceKm?: number;
}) {
  const rating = entryRating(entry);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:shadow-sm",
        isSelected ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-white hover:border-accent/40"
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        <Image src={cld(entryImage(entry), { quality: "auto" })} alt={entryName(entry)} fill sizes="56px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{entryName(entry)}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{entryDescription(entry)}</p>
        <div className="mt-1 flex items-center gap-2">
          <KindChip entry={entry} />
          {rating !== null && (
            <div className="flex items-center gap-1">
              <Star size={10} className="fill-accent text-accent" />
              <span className="text-[10px] font-medium text-muted-foreground">{rating.toFixed(1)}</span>
            </div>
          )}
          {distanceKm !== undefined && (
            <span className="text-[10px] font-medium text-secondary">
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`} away
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
    </button>
  );
}
