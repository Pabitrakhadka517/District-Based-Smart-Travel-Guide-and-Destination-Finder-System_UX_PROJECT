"use client";
import { useState, useEffect } from "react";
import { Plus, FileEdit, CalendarCheck, CheckCircle2, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/cards/stat-card";
import { usePlans } from "@/hooks/use-content";
import type { District, TripPlan } from "@/types";
import { TripCard } from "./trip-card";
import { CreateTripModal } from "./create-trip-modal";
import { TripWorkspace } from "./trip-workspace";
import { DistrictPicker } from "./district-picker";

const PLANNING_STATUSES: TripPlan["status"][] = ["draft", "planned", "ready"];

function TripSection({
  title,
  plans,
  onOpen,
}: {
  title: string;
  plans: TripPlan[];
  onOpen: (p: TripPlan) => void;
}) {
  if (plans.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <TripCard key={plan.id} plan={plan} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

/** Full-screen Step 1 of the guided flow: choose a starting district before
 *  anything else. Once picked, CreateTripModal takes over for the trip's
 *  name/type/travelers/dates/budget with the district already attached. */
function DistrictPickStep({ onClose, onSelect }: { onClose: () => void; onSelect: (district: District) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {/* Fixed-height shell with its own internal scroll (not the whole overlay) —
          77 districts is taller than most viewports, and a flex-centered overlay
          that scrolls as a whole starts scrolled to the vertical middle of that
          content, hiding the search bar above the fold. Capping the height here
          and scrolling only the inner content keeps the search bar reachable
          from the top and matches EntityFormModal's established pattern. */}
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-10 rounded-lg bg-white/90 p-1.5 text-muted-foreground shadow-soft transition hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>
        <div className="overflow-y-auto p-6 sm:p-8">
          <DistrictPicker onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

export function PlannerClient() {
  const { data: allPlans = [], isLoading } = usePlans();
  const [view, setView]             = useState<"list" | "workspace">("list");
  const [activePlan, setActivePlan] = useState<TripPlan | null>(null);
  const [openedFresh, setOpenedFresh] = useState(false);
  const [showDistrictPick, setShowDistrictPick] = useState(false);
  const [chosenDistrict, setChosenDistrict] = useState<District | null>(null);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const plans = allPlans.filter((p) => PLANNING_STATUSES.includes(p.status));

  /* Sort within each group by start date (soonest first) */
  const sortByDate = (arr: TripPlan[]) =>
    [...arr].sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    });

  const ready   = sortByDate(plans.filter((p) => p.status === "ready"));
  const planned = sortByDate(plans.filter((p) => p.status === "planned"));
  const drafts  = sortByDate(plans.filter((p) => p.status === "draft"));

  const openWorkspace = (plan: TripPlan, fresh = false) => {
    setActivePlan(plan);
    setOpenedFresh(fresh);
    setView("workspace");
  };

  if (mounted && isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (view === "workspace" && activePlan) {
    return (
      <TripWorkspace
        plan={activePlan}
        initialTab={openedFresh ? "discover" : "itinerary"}
        onBack={() => { setView("list"); setActivePlan(null); }}
        onUpdate={(updated) => setActivePlan(updated)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-muted-foreground">Future adventures</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-brand-600">Trip Planner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a district, discover everything there is to do, and build your itinerary — before you leave.
          </p>
        </div>
        <Button variant="accent" onClick={() => setShowDistrictPick(true)}>
          <Plus size={16} /> Plan a trip
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Drafts"    value={String(drafts.length)}  icon={FileEdit}      accent="brand"     />
        <StatCard label="Planning"  value={String(planned.length)} icon={CalendarCheck} accent="secondary" />
        <StatCard label="Ready"     value={String(ready.length)}   icon={CheckCircle2}  accent="success"   />
      </div>

      {/* Trip groups or empty state */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-white/60 px-8 py-24 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-50 text-secondary">
            <Map size={36} />
          </div>
          <h3 className="mt-6 font-display text-xl font-bold text-brand-600">Start planning your next adventure</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Pick a district to see everything there is to do, build a day-by-day itinerary, track your
            packing list, and plan your budget — all before you leave home.
          </p>
          <Button variant="accent" className="mt-6" onClick={() => setShowDistrictPick(true)}>
            <Plus size={16} /> Plan your first trip
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          <TripSection title="Ready to go" plans={ready}   onOpen={openWorkspace} />
          <TripSection title="In planning" plans={planned} onOpen={openWorkspace} />
          <TripSection title="Drafts"      plans={drafts}  onOpen={openWorkspace} />
        </div>
      )}

      {showDistrictPick && (
        <DistrictPickStep
          onClose={() => setShowDistrictPick(false)}
          onSelect={(district) => { setChosenDistrict(district); setShowDistrictPick(false); }}
        />
      )}

      {chosenDistrict && (
        <CreateTripModal
          initialDistrictId={chosenDistrict.id}
          initialTitle={`Trip to ${chosenDistrict.name}`}
          onClose={() => setChosenDistrict(null)}
          onCreated={(plan) => { setChosenDistrict(null); openWorkspace(plan, true); }}
        />
      )}
    </div>
  );
}
