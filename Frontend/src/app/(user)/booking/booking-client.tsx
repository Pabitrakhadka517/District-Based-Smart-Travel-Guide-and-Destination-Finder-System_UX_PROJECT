"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  MapPin, CalendarDays, Users, Wallet, Hotel, Bus, Sparkles,
  Minus, Plus, Loader2, CheckCircle2, XCircle, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useDestinations, useGuides, useBookings, useCreateBooking, useCancelBooking,
} from "@/hooks/use-content";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { AccommodationType, TransportPreference } from "@/types";

const ACCOMMODATION_OPTIONS: { value: AccommodationType; label: string; rate: number; desc: string }[] = [
  { value: "Budget", label: "Budget", rate: 2000, desc: "Guesthouses & hostels" },
  { value: "Standard", label: "Standard", rate: 5000, desc: "3-star hotels" },
  { value: "Luxury", label: "Luxury", rate: 12000, desc: "Boutique & 5-star" },
];

const TRANSPORT_OPTIONS: { value: TransportPreference; label: string; rate: number }[] = [
  { value: "Local Bus", label: "Local Bus", rate: 1500 },
  { value: "Private Jeep", label: "Private Jeep", rate: 5000 },
  { value: "Domestic Flight", label: "Domestic Flight", rate: 12000 },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingClient() {
  // This route requires auth (see middleware.ts), so the user is always
  // logged in here — `mounted` exists purely to keep the "Your bookings"
  // section (which reads an auth-gated query) stable during hydration,
  // since the server always renders before the auth store rehydrates.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: destinations = [] } = useDestinations();
  const { data: allGuides = [] } = useGuides();
  const { data: bookings = [] } = useBookings();
  const createBooking = useCreateBooking();
  const cancelBooking = useCancelBooking();

  const [destinationId, setDestinationId] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState(50000);
  const [accommodationType, setAccommodationType] = useState<AccommodationType>("Standard");
  const [transportPreference, setTransportPreference] = useState<TransportPreference>("Local Bus");
  const [notes, setNotes] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const destination = destinations.find((d) => d.id === destinationId) ?? null;

  const accommodationRate = ACCOMMODATION_OPTIONS.find((o) => o.value === accommodationType)!.rate;
  const transportRate = TRANSPORT_OPTIONS.find((o) => o.value === transportPreference)!.rate;
  const estimatedCost = travelers * (accommodationRate + transportRate);
  const overBudget = budget > 0 && estimatedCost > budget;

  const recommendedGuides = useMemo(() => {
    if (!destination) return [];
    const local = allGuides.filter((g) => g.districtId === destination.districtId);
    const pool = local.length > 0 ? local : allGuides.filter((g) => g.featured);
    return pool.slice(0, 3);
  }, [destination, allGuides]);

  const destinationById = useMemo(
    () => Object.fromEntries(destinations.map((d) => [d.id, d])),
    [destinations]
  );

  const canSave = !!destinationId && !!travelDate && travelers >= 1;

  const handleSave = async () => {
    if (!canSave) return;
    await createBooking.mutateAsync({
      destinationId, travelDate, travelers, budget, accommodationType, transportPreference,
      notes: notes.trim(),
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  return (
    <section className="container py-10">
      <p className="kicker text-muted-foreground">Plan &amp; reserve</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand-600">Book Your Trip</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Pick a destination, set your travel details, and get an instant cost estimate — plus local guides who know the area.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Form ── */}
        <div className="space-y-6 rounded-2xl border border-border bg-white p-6 shadow-soft">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <MapPin size={14} /> Destination
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a destination…</option>
              {[...destinations].sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <CalendarDays size={14} /> Travel date
            </label>
            <input
              type="date"
              min={todayISO()}
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Users size={14} /> Travelers
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTravelers((n) => Math.max(1, n - 1))}
                disabled={travelers <= 1}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-lg font-semibold">{travelers}</span>
              <button
                type="button"
                onClick={() => setTravelers((n) => Math.min(20, n + 1))}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted"
              >
                <Plus size={14} />
              </button>
              <span className="text-sm text-muted-foreground">
                {travelers === 1 ? "Solo traveller" : `${travelers} people`}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Wallet size={14} /> Your budget
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5000}
                max={500000}
                step={1000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="min-w-[110px] text-right text-sm font-semibold text-foreground">
                {formatCurrency(budget)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Hotel size={14} /> Accommodation type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOMMODATION_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAccommodationType(o.value)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all",
                    accommodationType === o.value
                      ? "border-brand-600 bg-brand-50"
                      : "border-border bg-white hover:border-brand-200"
                  )}
                >
                  <p className="text-sm font-semibold text-brand-600">{o.label}</p>
                  <p className="text-[11px] text-muted-foreground">{o.desc}</p>
                  <p className="mt-1 text-xs font-medium text-foreground">{formatCurrency(o.rate)}/person</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Bus size={14} /> Transport preference
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSPORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setTransportPreference(o.value)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all",
                    transportPreference === o.value
                      ? "border-brand-600 bg-brand-50"
                      : "border-border bg-white hover:border-brand-200"
                  )}
                >
                  <p className="text-sm font-semibold text-brand-600">{o.label}</p>
                  <p className="mt-1 text-xs font-medium text-foreground">{formatCurrency(o.rate)}/person</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Special requests, dietary needs, etc."
              className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <Button
            variant="accent"
            className="w-full"
            disabled={!canSave || createBooking.isPending}
            onClick={handleSave}
          >
            {createBooking.isPending ? (
              <><Loader2 size={15} className="animate-spin" /> Saving…</>
            ) : justSaved ? (
              <><CheckCircle2 size={15} /> Booking saved!</>
            ) : (
              "Save booking"
            )}
          </Button>
          {createBooking.isError && (
            <p className="text-sm text-destructive">
              {createBooking.error instanceof Error ? createBooking.error.message : "Something went wrong."}
            </p>
          )}
        </div>

        {/* ── Summary sidebar ── */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
            <h2 className="font-display text-lg font-bold text-brand-600">Booking summary</h2>

            {destination ? (
              <div className="mt-4 space-y-4">
                <div className="relative h-32 overflow-hidden rounded-xl">
                  <CloudinaryImage
                    image={destination.heroImage}
                    alt={destination.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 380px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-brand-600">{destination.name}</p>
                  <p className="text-xs text-muted-foreground">{destination.tagline}</p>
                </div>

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Travel date</dt>
                    <dd className="font-medium">{travelDate ? formatDate(travelDate) : "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Travelers</dt>
                    <dd className="font-medium">{travelers}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Accommodation</dt>
                    <dd className="font-medium">{accommodationType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Transport</dt>
                    <dd className="font-medium">{transportPreference}</dd>
                  </div>
                </dl>

                <div className="rounded-xl bg-brand-50 p-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Accommodation ({travelers} × {formatCurrency(accommodationRate)})</span>
                    <span>{formatCurrency(accommodationRate * travelers)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Transport ({travelers} × {formatCurrency(transportRate)})</span>
                    <span>{formatCurrency(transportRate * travelers)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-brand-100 pt-2 text-sm font-bold text-brand-600">
                    <span>Estimated total</span>
                    <span>{formatCurrency(estimatedCost)}</span>
                  </div>
                </div>

                {budget > 0 && (
                  <p className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    overBudget ? "text-destructive" : "text-success"
                  )}>
                    {overBudget ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                    {overBudget
                      ? `${formatCurrency(estimatedCost - budget)} over your budget`
                      : `Within your budget (${formatCurrency(budget - estimatedCost)} to spare)`}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Select a destination to see your estimate.</p>
            )}
          </div>

          {destination && recommendedGuides.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
              <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-brand-600">
                <Sparkles size={16} /> Recommended local guides
              </h2>
              <div className="mt-3 space-y-3">
                {recommendedGuides.map((g) => (
                  <Link
                    key={g.id}
                    href={`/guides/${g.slug}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      <CloudinaryImage image={g.cover} alt={g.title} fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-600">{g.title}</p>
                      <p className="text-xs text-muted-foreground">By {g.author} · {g.readMinutes} min read</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Your bookings ── */}
      {mounted && (
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold text-brand-600">Your bookings</h2>
          {bookings.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={BookOpen} title="No bookings yet" description="Bookings you save will show up here." />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {bookings.map((b) => {
                const dest = destinationById[b.destinationId];
                return (
                  <div key={b.id} className="rounded-2xl border border-border bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-600">{dest?.name ?? "Destination"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(b.travelDate)} · {b.travelers} traveler{b.travelers > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge variant={b.status === "cancelled" ? "destructive" : b.status === "confirmed" ? "success" : "default"}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{b.accommodationType} · {b.transportPreference}</span>
                      <span className="font-semibold text-brand-600">{formatCurrency(b.estimatedCost)}</span>
                    </div>
                    {b.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => cancelBooking.mutate(b.id)}
                        disabled={cancelBooking.isPending}
                      >
                        Cancel booking
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
