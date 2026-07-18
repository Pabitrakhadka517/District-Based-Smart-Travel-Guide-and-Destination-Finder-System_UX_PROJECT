import { Compass, Mountain, Landmark, Sun, Users, TreePine, Gem, Wallet } from "lucide-react";
import type { TravelType, TripPlan } from "@/types";

type Icon = React.ComponentType<{ size?: number; className?: string }>;

/** A plan can be booked once it's Ready, isn't already linked to a booking,
 *  and has at least one destination and a start date — the same conditions
 *  createBooking enforces server-side. Used everywhere a "can this plan be
 *  booked?" decision is made (destination page CTA, the booking picker, the
 *  Trip Planner's "Book This Trip" button) so they can't drift out of sync. */
export function isBookablePlan(plan: TripPlan): boolean {
  return (
    plan.status === "ready" &&
    !plan.bookingId &&
    plan.destinationIds.length > 0 &&
    !!plan.startDate &&
    plan.startDate >= new Date().toISOString().slice(0, 10)
  );
}

/** A plan's planning details (destination, dates, budget, travellers…) are
 *  editable only up to "ready" — anything past that means a Booking exists
 *  (or the trip already finished), and the backend rejects changes to those
 *  fields (see updateTrip in planner.controller.ts). Travel Tracking, not
 *  the Planner, owns what happens to the plan from here. */
export function isLockedPlan(status: TripPlan["status"]): boolean {
  return status !== "draft" && status !== "planned" && status !== "ready";
}

export const TRAVEL_TYPE_CONFIG: Record<
  TravelType,
  { icon: Icon; label: string; color: string; bg: string; border: string; ring: string; bar: string }
> = {
  Adventure: { icon: Compass,  label: "Adventure", color: "text-accent",           bg: "bg-accent/10",      border: "border-accent/30",     ring: "ring-accent",        bar: "bg-accent"             },
  Trekking:  { icon: Mountain, label: "Trekking",  color: "text-brand-600",        bg: "bg-brand-50",       border: "border-brand-200",     ring: "ring-brand-400",     bar: "bg-brand-500"          },
  Cultural:  { icon: Landmark, label: "Cultural",  color: "text-maroon",           bg: "bg-maroon/10",      border: "border-maroon/30",     ring: "ring-maroon",        bar: "bg-maroon"             },
  Religious: { icon: Sun,      label: "Religious", color: "text-gold",             bg: "bg-gold/10",        border: "border-gold/30",       ring: "ring-gold",          bar: "bg-gold"               },
  Family:    { icon: Users,    label: "Family",    color: "text-success",          bg: "bg-success/10",     border: "border-success/30",    ring: "ring-success",       bar: "bg-success"            },
  Wildlife:  { icon: TreePine, label: "Wildlife",  color: "text-forest",           bg: "bg-forest/10",      border: "border-forest/30",     ring: "ring-forest",        bar: "bg-forest"             },
  Luxury:    { icon: Gem,      label: "Luxury",    color: "text-gold",             bg: "bg-gold/10",        border: "border-gold/30",       ring: "ring-gold",          bar: "bg-gold"               },
  Budget:    { icon: Wallet,   label: "Budget",    color: "text-muted-foreground", bg: "bg-muted",          border: "border-border",        ring: "ring-border",        bar: "bg-muted-foreground/40"},
};

export const STATUS_STYLE: Record<string, { badge: string; label: string; dot: string }> = {
  draft:     { badge: "bg-muted text-muted-foreground border-border",        label: "Draft",     dot: "bg-muted-foreground"  },
  planned:   { badge: "bg-brand-50 text-brand-600 border-brand-200",         label: "Planning",  dot: "bg-brand-400"         },
  ready:     { badge: "bg-success/10 text-success border-success/30",        label: "Ready",     dot: "bg-success"           },
  booked:    { badge: "bg-brand-100 text-brand-700 border-brand-300",       label: "Booked",         dot: "bg-brand-600"         },
  ongoing:   { badge: "bg-accent/10 text-accent border-accent/30",           label: "Ongoing",        dot: "bg-accent"            },
  completed: { badge: "bg-secondary/10 text-secondary border-secondary/30",  label: "Completed",      dot: "bg-secondary"         },
  cancelled: { badge: "bg-destructive/10 text-destructive border-destructive/20", label: "Cancelled",  dot: "bg-destructive"       },
};

/** Generate ISO date range from startDate to endDate (inclusive). */
export function dateRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** Format a YYYY-MM-DD string as "Mon 15 Jun". */
export function fmtDay(iso: string): string {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export function nanoid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
