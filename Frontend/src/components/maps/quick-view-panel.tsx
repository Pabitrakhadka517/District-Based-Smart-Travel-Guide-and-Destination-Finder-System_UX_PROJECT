"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, Clock, Star, ChevronRight, Plus, Check,
  Footprints, Mountain, CalendarDays, BookOpen, Navigation,
} from "lucide-react";
import type { TripPlan, District } from "@/types";
import {
  type MapEntry, entryImage, entryName, entryHref, entryDistrictName, entryCoordinates,
} from "@/lib/map-entry-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { cn, formatCurrency, directionsUrl } from "@/lib/utils";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { cld } from "@/lib/cloudinary";
import { usePlans, useUpdatePlan } from "@/hooks/use-content";
import { useAuth } from "@/store/auth-store";

function AddToTripDropdown({ destinationId, onClose }: { destinationId: string; onClose: () => void }) {
  const { data: plans = [] } = usePlans();
  const updatePlan = useUpdatePlan();
  const { isLoggedIn } = useAuth();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!isLoggedIn) {
    return (
      <div ref={ref} className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-border bg-white p-4 shadow-xl">
        <p className="text-sm text-muted-foreground">Sign in to add destinations to your trip planner.</p>
        <Link href="/auth/login" className="mt-3 block w-full rounded-lg bg-brand-600 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700">
          Sign in
        </Link>
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.status === "draft" || p.status === "planned" || p.status === "ready");

  async function addTo(plan: TripPlan) {
    if (added.has(plan.id)) return;
    if (plan.destinationIds.includes(destinationId)) {
      setAdded((s) => new Set([...s, plan.id]));
      return;
    }
    await updatePlan.mutateAsync({ id: plan.id, destinationIds: [...plan.destinationIds, destinationId] });
    setAdded((s) => new Set([...s, plan.id]));
  }

  return (
    <div ref={ref} className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-border bg-white shadow-xl">
      <p className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add to trip</p>
      {activePlans.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-sm text-muted-foreground">No active trips.</p>
          <Link href="/planner" className="mt-2 block text-xs font-medium text-secondary hover:underline">Create a trip →</Link>
        </div>
      ) : (
        <ul className="max-h-52 overflow-y-auto py-1">
          {activePlans.map((plan) => {
            const isAdded = added.has(plan.id) || plan.destinationIds.includes(destinationId);
            return (
              <li key={plan.id}>
                <button
                  onClick={() => addTo(plan)}
                  disabled={isAdded || updatePlan.isPending}
                  className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-muted", isAdded && "text-success")}
                >
                  {isAdded ? <Check size={14} className="shrink-0 text-success" /> : <Plus size={14} className="shrink-0 text-muted-foreground" />}
                  <span className="flex-1 truncate font-medium">{plan.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {plan.status === "draft" ? "Draft" : plan.status === "planned" ? "Planning" : "Ready"}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-border p-2">
        <Link href="/planner" className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-secondary hover:bg-secondary/10">
          <Plus size={12} />
          Create new trip
        </Link>
      </div>
    </div>
  );
}

export function QuickViewPanel({ entry, districtsById, onBack }: { entry: MapEntry; districtsById: Map<string, District>; onBack: () => void }) {
  const [showAddTrip, setShowAddTrip] = useState(false);
  const href = entryHref(entry);
  const district = entryDistrictName(entry, districtsById);
  const { lat, lng } = entryCoordinates(entry);

  return (
    <div className="flex flex-col h-full">
      <button onClick={onBack} className="flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition">
        <ArrowLeft size={13} />
        Back to list
      </button>

      <div className="relative mt-2 h-44 w-full overflow-hidden rounded-xl">
        <Image src={cld(entryImage(entry), { quality: "auto" })} alt={entryName(entry)} fill sizes="360px" className="object-cover" />
        <div className="absolute right-2 top-2">
          <WishlistButton id={entry.data.id} className="h-8 w-8 rounded-full bg-white/90 backdrop-blur shadow" />
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-base font-bold leading-tight text-foreground">{entryName(entry)}</h2>
          {(entry.kind === "destination" || entry.kind === "attraction") && (
            <div className="shrink-0"><Rating value={entry.data.rating} size={13} /></div>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {entry.kind === "destination" && (
            <>
              <Badge variant="secondary">{entry.data.category}</Badge>
              {entry.data.trending && <Badge className="bg-accent/10 text-accent border-accent/20">Trending</Badge>}
            </>
          )}
          {entry.kind === "attraction" && <Badge variant="secondary">{entry.data.category}</Badge>}
          {entry.kind === "trek" && (
            <>
              <Badge variant="secondary">{entry.data.difficulty}</Badge>
              <Badge variant="outline">{district}</Badge>
            </>
          )}
          {entry.kind === "festival" && (
            <>
              <Badge variant="secondary">{entry.data.type}</Badge>
              <Badge variant="outline">{entry.data.season}</Badge>
            </>
          )}
          {entry.kind === "guide" && <Badge variant="secondary">{entry.data.category}</Badge>}
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          {entry.kind === "destination" && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{entry.data.tagline}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="flex items-center gap-1">
                  <Star size={11} className="fill-accent text-accent" />
                  {entry.data.rating.toFixed(1)} ({entry.data.reviewCount} reviews)
                </span>
                <span className="flex items-center gap-1"><Clock size={11} />{district}</span>
              </div>
              {entry.data.budget && (
                <p className="flex items-center gap-1">
                  <span className="font-medium text-foreground">Budget from</span>
                  Rs {entry.data.budget.budget.toLocaleString()} / person
                </p>
              )}
            </>
          )}

          {entry.kind === "attraction" && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{entry.data.tagline}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="flex items-center gap-1">
                  <Star size={11} className="fill-accent text-accent" />
                  {entry.data.rating.toFixed(1)} ({entry.data.reviewCount} reviews)
                </span>
                <span className="flex items-center gap-1"><Clock size={11} />{district}</span>
              </div>
            </>
          )}

          {entry.kind === "trek" && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{entry.data.tagline}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="flex items-center gap-1"><Footprints size={11} />{entry.data.durationDays} days</span>
                <span className="flex items-center gap-1"><Mountain size={11} />{entry.data.maxAltitude.toLocaleString()} m</span>
                {entry.data.rating > 0 && (
                  <span className="flex items-center gap-1"><Star size={11} className="fill-accent text-accent" />{entry.data.rating.toFixed(1)}</span>
                )}
              </div>
              {entry.data.priceFrom > 0 && <p>From {formatCurrency(entry.data.priceFrom)}</p>}
            </>
          )}

          {entry.kind === "festival" && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{entry.data.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="flex items-center gap-1"><CalendarDays size={11} />{entry.data.month}</span>
                <span className="flex items-center gap-1"><Mountain size={11} />{district}</span>
                <span>{entry.data.duration}</span>
              </div>
            </>
          )}

          {entry.kind === "guide" && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{entry.data.excerpt}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="flex items-center gap-1"><BookOpen size={11} />{entry.data.readMinutes} min read</span>
                <span>By {entry.data.author}</span>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <a href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <Navigation size={13} />
              Get Directions
            </Button>
          </a>

          {entry.kind === "destination" && (
            <div className="relative">
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setShowAddTrip((v) => !v)}>
                <Plus size={13} />
                Add to Trip Planner
              </Button>
              {showAddTrip && <AddToTripDropdown destinationId={entry.data.id} onClose={() => setShowAddTrip(false)} />}
            </div>
          )}

          {href && (
            <Link href={href}>
              <Button size="sm" className="w-full gap-1.5">
                {entry.kind === "destination" ? "View Destination Guide" : entry.kind === "attraction" ? "View Attraction" : entry.kind === "trek" ? "View Trek Details" : "Read Guide"}
                <ChevronRight size={13} />
              </Button>
            </Link>
          )}
          {entry.kind === "festival" && (
            <p className="text-center text-[11px] text-muted-foreground">No dedicated festival page yet — check back soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
