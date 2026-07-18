import Link from "next/link";
import { Mountain, Clock, TrendingUp, Star, CheckCircle2, PlusCircle } from "lucide-react";
import type { Trek } from "@/types";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { formatCurrency, cn } from "@/lib/utils";
import { DIFFICULTY_STYLE } from "@/lib/category-colors";

interface TrekCardProps {
  trek: Trek;
  /** Trip Planner discovery mode: shows a select toggle instead of only
   *  navigating away, and highlights the card when selected. Omitted
   *  everywhere else, so no existing usage changes behavior. */
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function TrekCard({ trek: t, selected, onToggleSelect }: TrekCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-white shadow-soft card-hover",
        selected ? "border-success ring-2 ring-success/40" : "border-border/70"
      )}
    >
      <Link href={`/treks/${t.slug}`} className="block">
        <div className="relative h-56 overflow-hidden">
          <CloudinaryImage image={t.heroImage} alt={t.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <span className={`absolute left-3.5 top-3.5 rounded-full px-2.5 py-1 text-xs font-medium ${DIFFICULTY_STYLE[t.difficulty]}`}>{t.difficulty}</span>
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-600 shadow-soft">
            <Star size={12} className="fill-accent text-accent" /> {t.rating.toFixed(1)}
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-secondary">{t.region}</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-brand-600 group-hover:text-secondary">{t.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.tagline}</p>
          <div className="mt-4 flex items-center gap-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={13} /> {t.durationDays}d</span>
            <span className="flex items-center gap-1"><TrendingUp size={13} /> {t.maxAltitude}m</span>
            <span className="flex items-center gap-1"><Mountain size={13} /> {t.distanceKm}km</span>
            <span className="ml-auto font-semibold text-brand-600">{formatCurrency(t.priceFrom)}</span>
          </div>
        </div>
      </Link>
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(); }}
          aria-label={selected ? `Remove ${t.name} from trip` : `Add ${t.name} to trip`}
          aria-pressed={!!selected}
          className={cn(
            "absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-soft backdrop-blur transition hover:scale-105",
            selected ? "bg-success text-white" : "bg-white/90 text-brand-600"
          )}
        >
          {selected ? <><CheckCircle2 size={14} /> Added</> : <><PlusCircle size={14} /> Add to trip</>}
        </button>
      )}
    </div>
  );
}
