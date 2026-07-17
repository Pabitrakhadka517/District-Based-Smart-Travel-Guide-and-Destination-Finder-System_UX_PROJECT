"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinPlus, Check, Loader2, Plus, ChevronDown } from "lucide-react";
import { usePlans, useUpdatePlan } from "@/hooks/use-content";
import { CreateTripModal } from "@/app/(user)/planner/create-trip-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TripPlan } from "@/types";

/** Lets a user add a destination directly into an existing trip plan, or spin up a new
 *  one with it pre-filled — the wishlist and trip planner otherwise never talk to each other. */
export function AddToTripButton({ destinationId }: { destinationId: string }) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const { data: plans = [] } = usePlans();
  const updatePlan = useUpdatePlan();
  const router = useRouter();

  const addToExisting = async (trip: TripPlan) => {
    if (trip.destinationIds.includes(destinationId)) return;
    setBusyTripId(trip.id);
    try {
      await updatePlan.mutateAsync({ id: trip.id, destinationIds: [...trip.destinationIds, destinationId] });
    } finally {
      setBusyTripId(null);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <MapPinPlus size={14} /> Add to trip
        <ChevronDown size={12} className={cn("ml-auto transition", open && "rotate-180")} />
      </Button>

      {open && (
        <>
          {/* Click-outside catcher */}
          <button
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-card">
            {plans.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">No trips yet — create one below.</p>
            )}
            {plans.map((trip) => {
              const already = trip.destinationIds.includes(destinationId);
              const busy = busyTripId === trip.id;
              return (
                <button
                  key={trip.id}
                  disabled={already || busy}
                  onClick={() => addToExisting(trip)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                    already ? "cursor-default text-success" : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className="flex-1 truncate">{trip.title}</span>
                  {busy && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                  {already && <Check size={14} />}
                </button>
              );
            })}
            <button
              onClick={() => { setOpen(false); setShowCreate(true); }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2.5 py-2 text-left text-sm font-medium text-secondary hover:bg-secondary/5"
            >
              <Plus size={14} /> Create new trip
            </button>
          </div>
        </>
      )}

      {showCreate && (
        <CreateTripModal
          initialDestinationIds={[destinationId]}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); router.push("/planner"); }}
        />
      )}
    </div>
  );
}
