"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  MapPin, CheckCircle2, CalendarDays, Users, TrendingUp, Route,
  Flame, CheckSquare, ChevronRight, Play, Trophy, BarChart2, Loader2,
  PencilLine, Camera, Wallet, Clock, X, Star,
  Circle, BarChart, Compass, Save, PenSquare, Hotel, Bus, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { GalleryUploader } from "@/components/dashboard/image-uploader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { usePlans, useUpdatePlan, useUserReviews, useDestinations, useCreateReview, useBookings } from "@/hooks/use-content";
import { TRAVEL_TYPE_CONFIG, STATUS_STYLE, fmtDay } from "@/app/(user)/planner/planner-utils";
import { EXPENSE_CATEGORY_STYLE } from "@/lib/category-colors";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { TripPlan, TripActivity, Review, Destination, Booking } from "@/types";

type BookingById = Map<string, Booking>;

/** Small inline row showing what was actually reserved — Booking is the
 *  source of truth here (it may differ from the plan's saved preference if
 *  the traveller changed accommodation/transport at booking time). */
function BookingMeta({ booking }: { booking?: Booking }) {
  if (!booking) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><Hash size={11} /> Ref #{booking.id.slice(-8).toUpperCase()}</span>
      <span className="flex items-center gap-1"><Hotel size={11} /> {booking.accommodationType}</span>
      <span className="flex items-center gap-1"><Bus size={11} /> {booking.transportPreference}</span>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

const todayISO = () => new Date().toISOString().slice(0, 10);

function tripTotalDays(t: TripPlan) {
  if (!t.startDate || !t.endDate) return 0;
  return Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86_400_000) + 1);
}

function tripCurrentDay(t: TripPlan) {
  if (!t.startDate) return 0;
  return Math.max(1, Math.floor((new Date(todayISO()).getTime() - new Date(t.startDate).getTime()) / 86_400_000) + 1);
}

function tripRemainingDays(t: TripPlan) {
  if (!t.endDate) return 0;
  return Math.max(0, Math.ceil((new Date(t.endDate).getTime() - new Date(todayISO()).getTime()) / 86_400_000));
}

function allActivities(t: TripPlan): TripActivity[] {
  return t.itinerary?.flatMap((d) => d.activities) ?? [];
}

function budgetBurn(t: TripPlan) {
  const total    = t.budget ?? 0;
  const days     = tripTotalDays(t);
  const elapsed  = Math.min(Math.max(0, tripCurrentDay(t) - 1), days);
  const daily    = days > 0 ? total / days : 0;
  const burned   = Math.round(daily * elapsed);
  const pct      = total > 0 ? Math.min(100, Math.round((burned / total) * 100)) : 0;
  return { total, daily: Math.round(daily), burned, remaining: total - burned, pct };
}

/* ── Photo panel ─────────────────────────────────────────────────────────── */
/* Photos are real Cloudinary uploads (via GalleryUploader) stored on the trip
 * document itself (synced via the same updatePlan mutation used for notes/
 * activities elsewhere on this page) so they're visible across devices. */

function PhotoPanel({ trip, updatePlan }: { trip: TripPlan; updatePlan: UpdateFn }) {
  const photos = trip.photos ?? [];

  return (
    <GalleryUploader
      type="planner"
      value={photos}
      onChange={(next) => void updatePlan.mutateAsync({ ...trip, photos: next })}
      alt={`${trip.title} photo`}
      label="Trip photos"
      max={20}
    />
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */

type Tab = "upcoming" | "ongoing" | "completed" | "analytics";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "upcoming",  label: "Upcoming",  icon: CalendarDays },
  { id: "ongoing",   label: "Ongoing",   icon: Flame        },
  { id: "completed", label: "Completed", icon: Trophy       },
  { id: "analytics", label: "Analytics", icon: BarChart2    },
];

/* ── Upcoming tab ─────────────────────────────────────────────────────────── */

function UpcomingTab({ trips, bookingById }: { trips: TripPlan[]; bookingById: BookingById }) {
  const updatePlan = useUpdatePlan();
  const [starting, setStarting] = useState<string | null>(null);

  const startTrip = async (trip: TripPlan) => {
    setStarting(trip.id);
    try { await updatePlan.mutateAsync({ ...trip, status: "ongoing" }); }
    finally { setStarting(null); }
  };

  if (trips.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No upcoming trips"
        description="Book a Ready trip plan from the Booking page, then return here to begin your journey."
        action={{ label: "Go to Booking", href: "/booking" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => {
        const cfg          = TRAVEL_TYPE_CONFIG[trip.travelType] ?? TRAVEL_TYPE_CONFIG.Adventure;
        const Icon         = cfg.icon;
        const status       = STATUS_STYLE[trip.status];
        const booking      = bookingById.get(trip.bookingId);
        // A trip can only actually start once an admin has approved its
        // booking — a still-pending booking means the traveller is waiting
        // on approval, not ready to travel.
        const canStart     = trip.status === "booked" && booking?.status === "confirmed";
        const awaitingApproval = trip.status === "booked" && booking?.status === "pending";
        const doneItems    = trip.checklist?.filter((i) => i.completed).length ?? 0;
        const totalItems   = trip.checklist?.length ?? 0;
        const checklistPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : null;
        const days         = tripTotalDays(trip);

        const now    = Date.now();
        const until  = trip.startDate
          ? Math.ceil((new Date(trip.startDate + "T00:00:00").getTime() - now) / 86_400_000)
          : null;
        const countdown =
          until === null ? null
          : until === 0 ? "Starts today"
          : until === 1 ? "Tomorrow"
          : `In ${until} days`;

        return (
          <div key={trip.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
            <div className={cn("flex items-center gap-3 px-5 py-3.5 border-b", cfg.bg, cfg.border)}>
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", cfg.bg)}>
                <Icon size={17} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-display font-bold text-foreground">{trip.title}</p>
                <p className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {countdown && (
                  <span className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    (until ?? 99) <= 3 ? "border-accent/30 bg-accent/10 text-accent"
                    : (until ?? 99) <= 14 ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground"
                  )}>
                    {countdown}
                  </span>
                )}
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", status?.badge)}>
                  {status?.label}
                </span>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Trip meta */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} /> {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </span>
                {days > 0 && <span className="flex items-center gap-1.5"><Clock size={13} /> {days} days</span>}
                {trip.travelers > 0 && (
                  <span className="flex items-center gap-1.5"><Users size={13} /> {trip.travelers} traveller{trip.travelers !== 1 ? "s" : ""}</span>
                )}
                {trip.destinationIds.length > 0 && (
                  <span className="flex items-center gap-1.5"><MapPin size={13} /> {trip.destinationIds.length} destination{trip.destinationIds.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {booking && <BookingMeta booking={booking} />}

              {/* Checklist readiness */}
              {checklistPct !== null && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckSquare size={11} />
                      Pre-departure checklist
                    </span>
                    <span className={cn("font-medium", checklistPct === 100 ? "text-success" : "")}>
                      {doneItems}/{totalItems} · {checklistPct}%
                      {checklistPct === 100 && " ✓"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", checklistPct === 100 ? "bg-success" : "bg-accent")}
                      style={{ width: `${checklistPct}%` }}
                    />
                  </div>
                  {checklistPct < 100 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {100 - checklistPct}% remaining — finish your checklist in the Trip Planner.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <Link href="/planner">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Edit in Planner
                </Button>
              </Link>
              {canStart ? (
                <Button variant="accent" size="sm" disabled={starting === trip.id} onClick={() => startTrip(trip)}>
                  {starting === trip.id
                    ? <><Loader2 size={13} className="animate-spin" /> Starting…</>
                    : <><Play size={13} /> Start trip</>
                  }
                </Button>
              ) : awaitingApproval ? (
                <span className="text-xs text-muted-foreground">Waiting for admin approval before you can start.</span>
              ) : (
                <span className="text-xs text-muted-foreground">This trip isn&apos;t booked yet.</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Ongoing trip card ───────────────────────────────────────────────────── */

type UpdateFn = ReturnType<typeof useUpdatePlan>;

function OngoingTripCard({ trip, updatePlan, booking }: { trip: TripPlan; updatePlan: UpdateFn; booking?: Booking }) {
  const [local, setLocal] = useState<TripPlan>({ ...trip });
  const [saving, setSaving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const cfg      = TRAVEL_TYPE_CONFIG[local.travelType] ?? TRAVEL_TYPE_CONFIG.Adventure;
  const Icon     = cfg.icon;
  const totalDays = tripTotalDays(local);
  const curDay    = tripCurrentDay(local);
  const remDays   = tripRemainingDays(local);
  const dayPct    = totalDays > 0 ? Math.min(100, Math.round((curDay / totalDays) * 100)) : 0;
  const burn      = budgetBurn(local);

  // A trip can be marked "ongoing" as soon as its booking is confirmed, which
  // can happen before its start date arrives — don't show fake day-1 progress
  // for a trip that hasn't actually started yet.
  const notStartedYet  = !!local.startDate && todayISO() < local.startDate;
  const daysUntilStart = notStartedYet
    ? Math.ceil((new Date(local.startDate).getTime() - new Date(todayISO()).getTime()) / 86_400_000)
    : 0;
  const displayDay  = notStartedYet ? 0 : curDay;
  const displayPct  = notStartedYet ? 0 : dayPct;

  const acts       = allActivities(local);
  const visitedCt  = acts.filter((a) => a.visited).length;
  const remainingCt = acts.filter((a) => !a.visited && a.title.trim()).length;
  const totalActs  = acts.filter((a) => a.title.trim()).length;

  const todayEntry = local.itinerary?.find((d) => d.date === todayISO());

  /* mark an activity visited */
  const toggleVisited = useCallback(async (dayId: string, actId: string) => {
    const next: TripPlan = {
      ...local,
      itinerary: local.itinerary.map((d) =>
        d.id !== dayId ? d : {
          ...d,
          activities: d.activities.map((a) =>
            a.id !== actId ? a : { ...a, visited: !a.visited }
          ),
        }
      ),
    };
    setLocal(next);
    try { await updatePlan.mutateAsync(next); } catch { /* */ }
  }, [local, updatePlan]);

  /* save notes */
  const saveNotes = useCallback(async () => {
    if (local.notes === trip.notes) return;
    setSaving(true);
    try { await updatePlan.mutateAsync(local); }
    finally { setSaving(false); }
  }, [local, trip.notes, updatePlan]);

  const completeTrip = async () => {
    setCompleting(true);
    try { await updatePlan.mutateAsync({ ...local, status: "completed" }); }
    finally { setCompleting(false); }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
      {/* Header */}
      <div className={cn("flex items-center gap-3 px-5 py-4 border-b", cfg.bg, cfg.border)}>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", cfg.bg)}>
          <Icon size={20} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-display text-lg font-bold text-foreground">{local.title}</p>
          <p className={cn("text-xs font-semibold", cfg.color)}>{cfg.label} · {formatDate(local.startDate)} – {formatDate(local.endDate)}</p>
        </div>
        <span className="shrink-0 flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <Flame size={11} className="animate-pulse" /> Ongoing
        </span>
      </div>

      {booking && (
        <div className="border-b border-border px-5 py-3">
          <BookingMeta booking={booking} />
        </div>
      )}

      <div className="px-5 py-5 space-y-6">
        {/* ── Trip progress ── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Trip progress</span>
            <span className="text-xs font-medium text-accent">
              {notStartedYet
                ? `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? "s" : ""}`
                : `${dayPct}% complete`}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                notStartedYet ? "bg-muted-foreground/30" : "bg-gradient-to-r from-accent to-success"
              )}
              style={{ width: `${displayPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{fmtDay(local.startDate)}</span>
            <span className="font-semibold text-accent">
              {notStartedYet ? "Not started yet" : `Day ${curDay} of ${totalDays}`}
            </span>
            <span>{fmtDay(local.endDate)}</span>
          </div>
        </div>

        {/* ── Live stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Current day",       value: `${displayDay}/${totalDays}`, color: "text-accent",    icon: CalendarDays  },
            { label: "Days remaining",    value: String(remDays),           color: "text-brand-600", icon: Clock         },
            { label: "Activities visited",value: `${visitedCt}/${totalActs}`, color: "text-success", icon: CheckCircle2 },
            { label: "Yet to visit",      value: String(remainingCt),       color: "text-secondary", icon: Compass       },
          ].map(({ label, value, color, icon: StatIcon }) => (
            <div key={label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <StatIcon size={14} className={cn("mx-auto mb-1", color)} />
              <p className={cn("font-display text-xl font-bold", color)}>{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Today's itinerary ── */}
        {todayEntry ? (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
              Today — {fmtDay(todayISO())}
            </p>
            <p className="font-semibold text-foreground">{todayEntry.title || `Day ${todayEntry.day}`}</p>
            {todayEntry.activities.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {todayEntry.activities.filter((a) => a.title.trim()).map((act) => (
                  <li key={act.id} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleVisited(todayEntry.id, act.id)}
                      className="shrink-0 transition hover:scale-110"
                      title={act.visited ? "Mark not visited" : "Mark visited"}
                    >
                      {act.visited
                        ? <CheckCircle2 size={18} className="text-success" />
                        : <Circle size={18} className="text-muted-foreground" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-sm", act.visited ? "text-muted-foreground line-through" : "text-foreground")}>
                        {act.time && <span className="mr-2 text-xs text-muted-foreground">{act.time}</span>}
                        {act.title}
                      </span>
                      {act.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <MapPin size={10} /> {act.location}
                        </p>
                      )}
                    </div>
                    {act.visited && (
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        Visited
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No activities planned for today.</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Today — {fmtDay(todayISO())}</p>
            <p className="text-sm text-muted-foreground">No itinerary entry for today.</p>
          </div>
        )}

        {/* ── Budget tracker ── */}
        {local.budget > 0 && (
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Wallet size={14} className="text-accent" /> Budget tracker
              </p>
              <span className="text-xs text-muted-foreground">Estimated burn rate</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", burn.pct > 90 ? "bg-destructive" : burn.pct > 70 ? "bg-warning" : "bg-success")}
                style={{ width: `${burn.pct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="font-semibold text-foreground">{formatCurrency(burn.burned)}</p>
                <p className="text-muted-foreground">Est. spent</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{formatCurrency(burn.daily)}/day</p>
                <p className="text-muted-foreground">Daily rate</p>
              </div>
              <div>
                <p className={cn("font-semibold", burn.remaining < 0 ? "text-destructive" : "text-success")}>
                  {formatCurrency(Math.abs(burn.remaining))}
                </p>
                <p className="text-muted-foreground">Est. remaining</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Collapsible sections ── */}
        <div className="space-y-2">
          {/* Full timeline toggle */}
          {local.itinerary && local.itinerary.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setTimelineOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition"
              >
                <span className="flex items-center gap-2"><Route size={14} className="text-muted-foreground" /> Travel Timeline</span>
                <ChevronRight size={14} className={cn("text-muted-foreground transition", timelineOpen && "rotate-90")} />
              </button>
              {timelineOpen && (
                <div className="border-t border-border px-4 py-3 space-y-1.5 bg-muted/20">
                  {local.itinerary.map((d) => {
                    const isPast   = d.date < todayISO();
                    const isToday  = d.date === todayISO();
                    const dayActs  = d.activities.filter((a) => a.title.trim());
                    const dayDone  = dayActs.filter((a) => a.visited).length;
                    return (
                      <div key={d.id} className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm", isToday && "bg-accent/10")}>
                        <div className={cn(
                          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                          isPast ? "bg-success text-white" : isToday ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {isPast ? <CheckCircle2 size={13} /> : d.day}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium truncate", isPast ? "text-muted-foreground line-through" : "text-foreground")}>
                            {d.title || `Day ${d.day}`}
                          </p>
                          {dayActs.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {dayDone}/{dayActs.length} activities visited
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{d.date && fmtDay(d.date)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Travel notes toggle */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => { setNotesOpen((o) => !o); setTimeout(() => noteRef.current?.focus(), 50); }}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition"
            >
              <span className="flex items-center gap-2"><PencilLine size={14} className="text-muted-foreground" /> Travel Notes</span>
              <ChevronRight size={14} className={cn("text-muted-foreground transition", notesOpen && "rotate-90")} />
            </button>
            {notesOpen && (
              <div className="border-t border-border p-4 bg-muted/20 space-y-2">
                <textarea
                  ref={noteRef}
                  value={local.notes ?? ""}
                  onChange={(e) => setLocal((p) => ({ ...p, notes: e.target.value }))}
                  rows={5}
                  placeholder="Add travel notes, observations, or memories…"
                  className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex justify-end">
                  <Button size="sm" variant="accent" disabled={saving} onClick={saveNotes}>
                    {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <><Save size={12} /> Save notes</>}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Trip photos toggle */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setPhotosOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition"
            >
              <span className="flex items-center gap-2"><Camera size={14} className="text-muted-foreground" /> Trip Photos</span>
              <ChevronRight size={14} className={cn("text-muted-foreground transition", photosOpen && "rotate-90")} />
            </button>
            {photosOpen && (
              <div className="border-t border-border p-4 bg-muted/20">
                <PhotoPanel trip={local} updatePlan={updatePlan} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {local.destinationIds.length} destination{local.destinationIds.length !== 1 ? "s" : ""} · {formatCurrency(local.budget)} budget
        </span>
        <Button
          variant="outline"
          size="sm"
          className="border-success/40 text-success hover:bg-success/10"
          disabled={completing}
          onClick={completeTrip}
        >
          {completing
            ? <><Loader2 size={13} className="animate-spin" /> Completing…</>
            : <><CheckCircle2 size={13} /> Mark complete</>
          }
        </Button>
      </div>
    </div>
  );
}

/* ── Ongoing tab ─────────────────────────────────────────────────────────── */

function OngoingTab({ trips, bookingById }: { trips: TripPlan[]; bookingById: BookingById }) {
  const updatePlan = useUpdatePlan();

  if (trips.length === 0) {
    return (
      <EmptyState
        icon={Flame}
        title="No active trips"
        description="Start a trip from the Upcoming tab to begin tracking your journey here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {trips.map((trip) => (
        <OngoingTripCard key={trip.id} trip={trip} updatePlan={updatePlan} booking={bookingById.get(trip.bookingId)} />
      ))}
    </div>
  );
}

/* ── Trip review widget ──────────────────────────────────────────────────── */

type DestState = {
  rating: number; hover: number; body: string;
  submitting: boolean; error: string | null; done: boolean;
};

function TripReviewWidget({ destinationIds, userReviews, allDestinations }: {
  destinationIds: string[];
  userReviews: Review[];
  allDestinations: Destination[];
}) {
  const createReview = useCreateReview();

  const [states, setStates] = useState<Record<string, DestState>>(() =>
    Object.fromEntries(
      destinationIds.map((id) => [id, { rating: 5, hover: 0, body: "", submitting: false, error: null, done: false }])
    )
  );

  const reviewMap = useMemo(() => new Map(userReviews.map((r) => [r.destinationId, r])), [userReviews]);
  const destMap   = useMemo(() => new Map(allDestinations.map((d) => [d.id, d])), [allDestinations]);

  const patch = (id: string, p: Partial<DestState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const submit = async (destId: string) => {
    const s = states[destId];
    if (!s || s.submitting) return;
    patch(destId, { submitting: true, error: null });
    try {
      await createReview.mutateAsync({
        destinationId: destId,
        rating: s.rating,
        title: "Trip review",
        body: s.body.trim(),
        photos: [],
      });
      patch(destId, { submitting: false, done: true });
    } catch (e) {
      patch(destId, { submitting: false, error: e instanceof Error ? e.message : "Failed to submit" });
    }
  };

  if (destinationIds.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Rate Your Destinations
      </p>
      <div className="space-y-2.5">
        {destinationIds.map((destId) => {
          const name     = destMap.get(destId)?.name ?? "Destination";
          const existing = reviewMap.get(destId);
          const s        = states[destId] ?? { rating: 5, hover: 0, body: "", submitting: false, error: null, done: false };

          if (existing || s.done) {
            return (
              <div key={destId} className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                <span className="text-sm font-medium text-foreground">{name}</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={13} className={i <= (existing?.rating ?? s.rating) ? "fill-accent text-accent" : "fill-muted text-muted"} />
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                    <CheckCircle2 size={11} /> {s.done && !existing ? "Submitted" : "Reviewed"}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={destId} className="rounded-xl border border-border bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-brand-600">{name}</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => patch(destId, { rating: i })}
                    onMouseEnter={() => patch(destId, { hover: i })}
                    onMouseLeave={() => patch(destId, { hover: 0 })}
                  >
                    <Star size={24} className={cn(
                      "transition hover:scale-110",
                      i <= (s.hover || s.rating) ? "fill-accent text-accent" : "fill-muted text-muted"
                    )} />
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {["", "Terrible", "Poor", "Average", "Good", "Excellent"][s.hover || s.rating]}
                </span>
              </div>
              <textarea
                value={s.body}
                onChange={(e) => patch(destId, { body: e.target.value })}
                rows={2}
                placeholder="Share your experience… (optional)"
                className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {s.error && <p className="text-xs text-destructive">{s.error}</p>}
              <Button size="sm" variant="accent" disabled={s.submitting} onClick={() => submit(destId)}>
                {s.submitting
                  ? <><Loader2 size={12} className="animate-spin" /> Submitting…</>
                  : <><PenSquare size={12} /> Submit review</>
                }
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Completed tab ───────────────────────────────────────────────────────── */

function CompletedTab({ trips }: { trips: TripPlan[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const completed  = trips.filter((t) => t.status === "completed");
  const cancelled  = trips.filter((t) => t.status === "cancelled");
  const allSorted  = [...trips].sort((a, b) => (b.endDate ?? "").localeCompare(a.endDate ?? ""));
  const updatePlan = useUpdatePlan();

  const { user } = useAuth();
  const { data: userReviews    = [] } = useUserReviews(user?.id ?? "");
  const { data: allDestinations = [] } = useDestinations();

  if (trips.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No completed trips yet"
        description="Complete an active trip to see your travel history and memories here."
      />
    );
  }

  const uniqueDests = new Set(completed.flatMap((t) => t.destinationIds)).size;

  return (
    <div className="space-y-8">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Completed",            value: completed.length,  color: "text-success",   icon: Trophy      },
          { label: "Destinations visited", value: uniqueDests,       color: "text-brand-600", icon: MapPin       },
          { label: "Cancelled",            value: cancelled.length,  color: "text-destructive", icon: X          },
        ].map(({ label, value, color, icon: SIcon }) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-4 text-center shadow-soft">
            <SIcon size={16} className={cn("mx-auto mb-1.5", color)} />
            <p className={cn("font-display text-2xl font-bold", color)}>{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative space-y-5 border-l-2 border-border pl-6">
        {allSorted.map((trip) => {
          const cfg        = TRAVEL_TYPE_CONFIG[trip.travelType] ?? TRAVEL_TYPE_CONFIG.Adventure;
          const Icon       = cfg.icon;
          const status     = STATUS_STYLE[trip.status];
          const days       = tripTotalDays(trip);
          const isExpanded = expandedId === trip.id;
          const acts       = allActivities(trip);
          const visitedCt  = acts.filter((a) => a.visited).length;

          return (
            <div key={trip.id} className="relative">
              <span className={cn(
                "absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full bg-white ring-2",
                trip.status === "completed" ? "ring-success" : "ring-border"
              )}>
                <span className={cn("h-2.5 w-2.5 rounded-full", status?.dot ?? "bg-muted-foreground")} />
              </span>

              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
                {/* Summary row */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", cfg.bg)}>
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-display font-semibold text-brand-600">{trip.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                      {days > 0 && ` · ${days} days`}
                      {trip.destinationIds.length > 0 && ` · ${trip.destinationIds.length} dest.`}
                      {visitedCt > 0 && ` · ${visitedCt} activities`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {trip.budget > 0 && (
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(trip.budget)}</span>
                    )}
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", status?.badge)}>
                      {status?.label}
                    </span>
                  </div>
                </div>

                {/* Memories (completed only) */}
                {trip.status === "completed" && (
                  <>
                    <div className="flex items-center justify-between border-t border-border/60 px-5 py-2.5">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : trip.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition"
                      >
                        <Camera size={12} /> {isExpanded ? "Hide memories" : "View memories, photos & reviews"}
                      </button>
                      <ChevronRight size={14} className={cn("text-muted-foreground transition", isExpanded && "rotate-90")} />
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border/60 px-5 py-5 space-y-5 bg-muted/20">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Days",           value: String(days),                      color: "text-brand-600" },
                            { label: "Activities",     value: String(visitedCt || acts.length),  color: "text-success"   },
                            { label: "Budget",         value: formatCurrency(trip.budget),        color: "text-accent"    },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="rounded-xl border border-border bg-white p-3 text-center">
                              <p className={cn("font-display text-lg font-bold", color)}>{value}</p>
                              <p className="text-[11px] text-muted-foreground">{label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Photos */}
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trip Photos</p>
                          <PhotoPanel trip={trip} updatePlan={updatePlan} />
                        </div>

                        {/* Notes / memories */}
                        {trip.notes && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Travel Notes</p>
                            <blockquote className="rounded-xl border-l-4 border-accent bg-white pl-4 pr-4 py-3 text-sm text-foreground italic leading-relaxed">
                              &quot;{trip.notes}&quot;
                            </blockquote>
                          </div>
                        )}

                        {/* Highlights: visited activities */}
                        {acts.filter((a) => a.visited && a.title.trim()).length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Places Visited</p>
                            <div className="flex flex-wrap gap-2">
                              {acts.filter((a) => a.visited && a.title.trim()).map((a) => (
                                <span key={a.id} className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                                  <CheckCircle2 size={10} /> {a.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {!trip.notes && acts.filter((a) => a.visited).length === 0 && (
                          <p className="text-sm text-muted-foreground italic">No memories saved for this trip.</p>
                        )}

                        {/* Rate destinations */}
                        {trip.destinationIds.length > 0 && (
                          <TripReviewWidget
                            destinationIds={trip.destinationIds}
                            userReviews={userReviews}
                            allDestinations={allDestinations}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Analytics tab ───────────────────────────────────────────────────────── */

function AnalyticsTab({ allTrips }: { allTrips: TripPlan[] }) {
  const completed  = allTrips.filter((t) => t.status === "completed");
  const totalDays  = completed.reduce((s, t) => s + tripTotalDays(t), 0);
  const totalSpent = completed.reduce((s, t) => s + (t.budget ?? 0), 0);
  const uniqueDests = new Set(completed.flatMap((t) => t.destinationIds)).size;
  const totalActs  = completed.reduce((s, t) => s + allActivities(t).filter((a) => a.visited).length, 0);
  const avgBudget  = completed.length > 0 ? Math.round(totalSpent / completed.length) : 0;

  const travelTypeCount: Record<string, number> = {};
  for (const t of completed) {
    travelTypeCount[t.travelType] = (travelTypeCount[t.travelType] ?? 0) + 1;
  }
  const topType = Object.entries(travelTypeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "–";

  /* Monthly trip heatmap */
  const monthCount: Record<string, number> = {};
  for (const t of completed) {
    if (t.startDate) {
      const m = t.startDate.slice(0, 7); // "2025-06"
      monthCount[m] = (monthCount[m] ?? 0) + 1;
    }
  }
  const months = Object.entries(monthCount).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const maxMonth = Math.max(...months.map(([, v]) => v), 1);

  if (completed.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No analytics yet"
        description="Complete at least one trip to see your personal travel stats."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero stats: Days Traveled / Places Visited / Trips Completed */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Days Traveled",    value: totalDays,         unit: "days",  color: "text-brand-600",  icon: CalendarDays, bg: "bg-brand-50"    },
          { label: "Places Visited",   value: uniqueDests + totalActs, unit: "places", color: "text-accent", icon: MapPin,      bg: "bg-accent/10"  },
          { label: "Trips Completed",  value: completed.length,  unit: "trips", color: "text-success",    icon: Trophy,       bg: "bg-success/10"  },
        ].map(({ label, value, unit, color, icon: HIcon, bg }) => (
          <div key={label} className={cn("rounded-2xl border border-border p-5 shadow-soft", bg)}>
            <div className="flex items-center gap-2 mb-3">
              <HIcon size={16} className={cn("shrink-0", color)} />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className={cn("font-display text-4xl font-bold", color)}>{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{unit}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total budget spent",   value: formatCurrency(totalSpent),             icon: Wallet, color: "text-secondary"  },
          { label: "Average trip budget",  value: avgBudget > 0 ? formatCurrency(avgBudget) : "–", icon: BarChart, color: "text-maroon" },
          { label: "Favourite travel type",value: topType,                                 icon: Star,       color: "text-accent" },
        ].map(({ label, value, icon: SIcon, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-soft">
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted", color)}>
              <SIcon size={18} />
            </div>
            <div>
              <p className={cn("font-display text-lg font-bold", color)}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Travel-type breakdown */}
      {Object.keys(travelTypeCount).length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <p className="mb-4 font-display font-semibold text-brand-600">Travel style breakdown</p>
          <div className="space-y-3">
            {Object.entries(travelTypeCount)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const cfg = TRAVEL_TYPE_CONFIG[type as keyof typeof TRAVEL_TYPE_CONFIG];
                if (!cfg) return null;
                const TIcon = cfg.icon;
                const pct   = Math.round((count / completed.length) * 100);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", cfg.bg)}>
                      <TIcon size={14} className={cfg.color} />
                    </div>
                    <span className="w-24 text-sm font-medium text-foreground">{cfg.label}</span>
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", cfg.bar)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-right text-xs text-muted-foreground">{count} trip{count !== 1 ? "s" : ""}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Monthly activity */}
      {months.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <p className="mb-4 font-display font-semibold text-brand-600">Trips by month</p>
          <div className="flex items-end gap-2 h-24">
            {months.map(([month, count]) => {
              const heightPct = Math.round((count / maxMonth) * 100);
              const label = new Date(month + "-15").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
              return (
                <div key={month} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-accent">{count}</span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-brand-400 transition-all"
                      style={{ height: `${heightPct}%` }}
                      title={`${label}: ${count} trip${count !== 1 ? "s" : ""}`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cumulative spend breakdown */}
      {completed.some((t) => t.budgetBreakdown) && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <p className="mb-4 font-display font-semibold text-brand-600">Cumulative spend breakdown</p>
          {(() => {
            const totals = completed.reduce(
              (acc, t) => ({
                accommodation:  acc.accommodation  + (t.budgetBreakdown?.accommodation  ?? 0),
                food:           acc.food           + (t.budgetBreakdown?.food           ?? 0),
                transportation: acc.transportation + (t.budgetBreakdown?.transportation ?? 0),
                activities:     acc.activities     + (t.budgetBreakdown?.activities     ?? 0),
                other:          acc.other          + (t.budgetBreakdown?.other          ?? 0),
              }),
              { accommodation: 0, food: 0, transportation: 0, activities: 0, other: 0 }
            );
            const total = Object.values(totals).reduce((s, v) => s + v, 0);
            return (
              <div className="space-y-2.5">
                {(["accommodation", "food", "transportation", "activities", "other"] as const).map((key) => {
                  const labelMap = { accommodation: "Accommodation", food: "Food & Dining", transportation: "Transportation", activities: "Activities", other: "Other" };
                  const colorMap = {
                    accommodation: EXPENSE_CATEGORY_STYLE.accommodation.bar,
                    food: EXPENSE_CATEGORY_STYLE.food.bar,
                    transportation: EXPENSE_CATEGORY_STYLE.transportation.bar,
                    activities: EXPENSE_CATEGORY_STYLE.activities.bar,
                    other: EXPENSE_CATEGORY_STYLE.other.bar
                  };
                  const val = totals[key];
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-3 text-sm">
                      <div className={cn("h-3 w-3 shrink-0 rounded-sm", colorMap[key])} />
                      <span className="w-32 text-muted-foreground">{labelMap[key]}</span>
                      <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", colorMap[key])} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right text-xs font-medium text-foreground">{formatCurrency(val)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function TrackingPage() {
  const { data: allTrips = [], isLoading } = usePlans();
  const { data: allBookings = [] } = useBookings();
  const [tab, setTab]     = useState<Tab>("upcoming");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const bookingById: BookingById = useMemo(
    () => new Map(allBookings.map((b) => [b.id, b])),
    [allBookings]
  );

  // Tracking only shows trips that have actually been booked — a plan that's
  // merely "Ready" still belongs in the Planner until it's booked. Requiring
  // a real, non-cancelled Booking to exist (not just "not cancelled", which
  // would also be true for a missing booking) closes the gap where a plan's
  // status was set to "booked" without ever going through createBooking.
  const upcoming  = allTrips.filter((t) => {
    if (t.status !== "booked") return false;
    const booking = bookingById.get(t.bookingId);
    return !!booking && booking.status !== "cancelled";
  });
  const ongoing   = allTrips.filter((t) => t.status === "ongoing");
  const completed = allTrips.filter((t) => t.status === "completed" || t.status === "cancelled");

  useEffect(() => {
    if (mounted && !isLoading && ongoing.length > 0 && tab === "upcoming" && upcoming.length === 0) {
      setTab("ongoing");
    }
  }, [mounted, isLoading, ongoing.length, upcoming.length, tab]);

  const tabCounts: Record<Tab, number> = {
    upcoming:  upcoming.length,
    ongoing:   ongoing.length,
    completed: completed.length,
    analytics: 0,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-muted-foreground">Active & completed journeys</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-brand-600">Travel Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor active journeys, log memories, and review your travel history.
          </p>
        </div>
        {ongoing.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/8 px-4 py-2 text-sm font-semibold text-accent">
            <Flame size={15} className="animate-pulse" />
            {ongoing.length} trip{ongoing.length !== 1 ? "s" : ""} in progress
          </div>
        )}
      </div>

      {/* How it works banner (first visit, no trips at all) */}
      {allTrips.length === 0 && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
          <p className="mb-4 font-display font-semibold text-brand-600">How it works</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {["Plan trip", "Build itinerary", "Mark Ready", "Book trip", "Start trip", "Track progress", "Complete", "View history"].map(
              (step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-600">{step}</span>
                  {i < arr.length - 1 && <ChevronRight size={14} className="shrink-0" />}
                </span>
              )
            )}
          </div>
          <div className="mt-4">
            <Link href="/planner">
              <Button variant="accent" size="sm"><Route size={14} /> Go to Trip Planner</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted p-1 scrollbar-hide">
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              tab === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TabIcon size={14} />
            {label}
            {tabCounts[id] > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                tab === id ? "bg-accent/10 text-accent" : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {tabCounts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "upcoming"  && <UpcomingTab  trips={upcoming}  bookingById={bookingById} />}
      {tab === "ongoing"   && <OngoingTab   trips={ongoing}   bookingById={bookingById} />}
      {tab === "completed" && <CompletedTab trips={completed} />}
      {tab === "analytics" && <AnalyticsTab allTrips={allTrips} />}
    </div>
  );
}
