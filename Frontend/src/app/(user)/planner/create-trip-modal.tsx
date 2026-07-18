"use client";
import { useState } from "react";
import {
  X, ArrowLeft, ArrowRight, Minus, Plus, Users,
  CalendarDays, Wallet, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCreatePlan } from "@/hooks/use-content";
import type { TravelType, TripPlan } from "@/types";
import { TRAVEL_TYPE_CONFIG } from "./planner-utils";
import { DEFAULT_CHECKLIST } from "./trip-checklist";
import { nanoid } from "./planner-utils";

interface Props {
  onClose: () => void;
  onCreated: (plan: TripPlan) => void;
  /** Pre-select destinations (e.g. "add to trip" from the wishlist page). */
  initialDestinationIds?: string[];
  /** Pre-chosen starting district (from the guided Step-1 district picker). */
  initialDistrictId?: string;
  /** Pre-fills the trip name, e.g. "Trip to Bhaktapur" after picking a district. */
  initialTitle?: string;
}

const TRAVEL_TYPES = Object.keys(TRAVEL_TYPE_CONFIG) as TravelType[];

export function CreateTripModal({
  onClose, onCreated, initialDestinationIds = [], initialDistrictId = "", initialTitle = "",
}: Props) {
  const createPlan = useCreatePlan();
  const [step, setStep] = useState<1 | 2>(1);

  /* Step 1 */
  const [title, setTitle]         = useState(initialTitle);
  const [travelType, setType]     = useState<TravelType>("Trekking");
  const [travelers, setTravelers] = useState(2);

  /* Step 2 */
  const [startDate, setStart] = useState("");
  const [endDate, setEnd]     = useState("");
  const [budget, setBudget]   = useState(65000);
  const [notes, setNotes]     = useState("");

  const canStep1 = title.trim().length >= 2;
  const canStep2 = !!startDate && !!endDate && endDate >= startDate;

  const nextStep = () => {
    if (canStep1) setStep(2);
  };

  const handleCreate = async () => {
    if (!canStep1 || !canStep2) return;

    /* budget breakdown: 40/25/20/10/5 split */
    const b = budget;
    const budgetBreakdown = {
      accommodation: Math.round(b * 0.40),
      food:          Math.round(b * 0.25),
      transportation:Math.round(b * 0.20),
      activities:    Math.round(b * 0.10),
      other:         Math.round(b * 0.05),
    };

    /* default checklist for this travel type */
    const checklist = (DEFAULT_CHECKLIST[travelType] ?? []).map((item) => ({
      id:        nanoid(),
      text:      item.text,
      category:  item.category,
      completed: false,
    }));

    const plan = await createPlan.mutateAsync({
      title: title.trim(),
      travelType,
      travelers,
      districtId: initialDistrictId,
      destinationIds: initialDestinationIds,
      startDate,
      endDate,
      budget,
      budgetBreakdown,
      status: "draft",
      notes: notes.trim(),
      itinerary: [],
      checklist,
    });

    onCreated(plan);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <span className="text-sm text-muted-foreground">New trip</span>
          )}
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-12 rounded-full transition-colors", "bg-brand-600")} />
            <div className={cn("h-2 w-12 rounded-full transition-colors", step === 2 ? "bg-brand-600" : "bg-muted")} />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <X size={18} />
          </button>
        </div>

        {/* Step 1: name + type + travelers */}
        {step === 1 && (
          <div className="px-6 py-6 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-brand-600">Plan your trip</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {initialDestinationIds.length > 0
                  ? `Give your trip a name — ${initialDestinationIds.length === 1 ? "your saved destination" : `your ${initialDestinationIds.length} saved destinations`} will be added.`
                  : "Give your trip a name and pick a travel style."}
              </p>
            </div>

            {/* Trip name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Trip name</label>
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Everest Base Camp 2026…"
                onKeyDown={(e) => e.key === "Enter" && nextStep()}
              />
            </div>

            {/* Travel type grid */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Travel type</label>
              <div className="grid grid-cols-4 gap-2">
                {TRAVEL_TYPES.map((t) => {
                  const cfg = TRAVEL_TYPE_CONFIG[t];
                  const Icon = cfg.icon;
                  const selected = travelType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-medium transition-all",
                        selected
                          ? `${cfg.border} ${cfg.bg} ${cfg.color} ring-2 ${cfg.ring} ring-offset-1`
                          : "border-border bg-white text-muted-foreground hover:border-brand-200 hover:bg-brand-50"
                      )}
                    >
                      <Icon size={20} className={selected ? cfg.color : ""} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Travelers */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Users size={14} /> Travelers
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTravelers((n) => Math.max(1, n - 1))}
                  disabled={travelers <= 1}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-semibold text-lg">{travelers}</span>
                <button
                  onClick={() => setTravelers((n) => Math.min(50, n + 1))}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted"
                >
                  <Plus size={14} />
                </button>
                <span className="text-sm text-muted-foreground">
                  {travelers === 1 ? "Solo traveller" : `${travelers} people`}
                </span>
              </div>
            </div>

            <Button
              variant="accent"
              className="w-full"
              disabled={!canStep1}
              onClick={nextStep}
            >
              Next: Dates & Budget <ArrowRight size={15} />
            </Button>
          </div>
        )}

        {/* Step 2: dates + budget + notes */}
        {step === 2 && (
          <div className="px-6 py-6 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-brand-600">Dates & budget</h2>
              <p className="mt-1 text-sm text-muted-foreground">When are you going and what&apos;s your total budget?</p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <CalendarDays size={13} /> Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (endDate && endDate < e.target.value) setEnd(e.target.value);
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <CalendarDays size={13} /> End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEnd(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Budget slider */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Wallet size={13} /> Total budget
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={5000}
                  max={1500000}
                  step={5000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="min-w-[90px] text-right text-sm font-semibold text-foreground">
                  NPR {budget.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>NPR 5,000</span>
                <span>NPR 1,500,000</span>
              </div>
              {/* quick budget allocation preview */}
              <div className="mt-1 flex rounded-xl overflow-hidden h-2">
                <div className="bg-brand-400"       style={{ width: "40%" }} title="Accommodation 40%" />
                <div className="bg-gold"            style={{ width: "25%" }} title="Food 25%" />
                <div className="bg-accent"          style={{ width: "20%" }} title="Transport 20%" />
                <div className="bg-secondary"       style={{ width: "10%" }} title="Activities 10%" />
                <div className="bg-muted"           style={{ width: "5%"  }} title="Other 5%" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Auto-split: 40% accommodation · 25% food · 20% transport · 10% activities · 5% other
              </p>
            </div>

            {/* Notes (optional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any ideas, reminders, or requirements…"
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button
              variant="accent"
              className="w-full"
              disabled={!canStep1 || !canStep2 || createPlan.isPending}
              onClick={handleCreate}
            >
              {createPlan.isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Creating…</>
              ) : (
                "Create trip"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
