"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin, CalendarDays, Users, Wallet, Hotel, Bus, Sparkles,
  Loader2, CheckCircle2, XCircle, BookOpen, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BookingConfirmation } from "./booking-confirmation";
import {
  useDestinations, useGuides, usePlans, useBookings, useCreateBooking, useCancelBooking,
} from "@/hooks/use-content";
import { isBookablePlan } from "@/app/(user)/planner/planner-utils";
import { useAuth } from "@/store/auth-store";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";
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

function TextField({
  label, value, onChange, required = false, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  const id = `booking-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export function BookingClient() {
  // This route requires auth (see middleware.ts), so the user is always
  // logged in here — `mounted` exists purely to keep auth-gated queries
  // stable during hydration, since the server always renders before the
  // auth store rehydrates.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get("planId");
  const confirmedId = searchParams.get("confirmed");

  const { user } = useAuth();
  const { data: destinations = [] } = useDestinations();
  const { data: allGuides = [] } = useGuides();
  const { data: plans = [] } = usePlans();
  const { data: bookings = [] } = useBookings();
  const createBooking = useCreateBooking();
  const cancelBooking = useCancelBooking();
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  // A trip plan is bookable once it's Ready, isn't already booked, and has
  // at least a destination and a start date — booking always starts from one
  // of these, never from a bare destination pick.
  const bookablePlans = useMemo(() => plans.filter(isBookablePlan), [plans]);
  const rawSelectedPlan = planIdParam ? plans.find((p) => p.id === planIdParam) ?? null : null;
  // A stale/invalid/already-booked planId in the URL (bookmarked link, back
  // button after booking, hand-edited query string) must not render a form
  // that's guaranteed to fail at submit time — treat it as "not selected"
  // and explain why instead.
  const selectedPlan = rawSelectedPlan && isBookablePlan(rawSelectedPlan) ? rawSelectedPlan : null;

  const [accommodationType, setAccommodationType] = useState<AccommodationType>("Standard");
  const [transportPreference, setTransportPreference] = useState<TransportPreference>("Local Bus");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [medicalInfo, setMedicalInfo] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [notes, setNotes] = useState("");

  // Seed the accommodation/transport pickers from the plan's saved preferences
  // once it's loaded — the user can still change their mind at booking time,
  // this just avoids asking again from scratch.
  useEffect(() => {
    if (selectedPlan) {
      setAccommodationType(selectedPlan.accommodationPreference);
      setTransportPreference(selectedPlan.transportPreference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan?.id]);

  const destination = selectedPlan
    ? destinations.find((d) => d.id === selectedPlan.destinationIds[0]) ?? null
    : null;

  const accommodationRate = ACCOMMODATION_OPTIONS.find((o) => o.value === accommodationType)!.rate;
  const transportRate = TRANSPORT_OPTIONS.find((o) => o.value === transportPreference)!.rate;
  const travelers = selectedPlan?.travelers ?? 1;
  const estimatedCost = travelers * (accommodationRate + transportRate);
  const overBudget = !!selectedPlan && selectedPlan.budget > 0 && estimatedCost > selectedPlan.budget;

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
  const confirmedBooking = confirmedId ? bookings.find((b) => b.id === confirmedId) ?? null : null;

  const canSave =
    !!selectedPlan && !!fullName.trim() && !!phone.trim() &&
    !!emergencyContactName.trim() && !!emergencyContactNumber.trim();

  const handleSave = async () => {
    if (!selectedPlan || !canSave) return;
    try {
      const booking = await createBooking.mutateAsync({
        tripPlanId: selectedPlan.id,
        accommodationType,
        transportPreference,
        fullName: fullName.trim(),
        phone: phone.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactNumber: emergencyContactNumber.trim(),
        nationality: nationality.trim(),
        passportNumber: passportNumber.trim(),
        medicalInfo: medicalInfo.trim(),
        specialRequirements: specialRequirements.trim(),
        notes: notes.trim(),
      });
      router.replace(`/booking?confirmed=${booking.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your booking. Please try again.");
    }
  };

  const closeConfirmation = () => router.replace("/booking");

  const scrollToBookings = () => {
    closeConfirmation();
    document.getElementById("your-bookings")?.scrollIntoView({ behavior: "smooth" });
  };

  const confirmCancel = () => {
    if (!pendingCancelId) return;
    cancelBooking.mutate(pendingCancelId, {
      onSuccess: () => toast.success("Booking cancelled."),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't cancel your booking."),
    });
    setPendingCancelId(null);
  };

  return (
    <section className="container py-10">
      <ConfirmDialog
        open={!!pendingCancelId}
        title="Cancel this booking?"
        description="This can't be undone — you'll need to book again if you change your mind."
        confirmLabel="Yes, cancel booking"
        cancelLabel="Keep booking"
        variant="danger"
        loading={cancelBooking.isPending}
        onConfirm={confirmCancel}
        onCancel={() => setPendingCancelId(null)}
      />
      {confirmedBooking && destinationById[confirmedBooking.destinationId] && (
        <BookingConfirmation
          booking={confirmedBooking}
          destination={destinationById[confirmedBooking.destinationId]}
          guide={recommendedGuides[0]}
          onClose={closeConfirmation}
          onViewBookings={scrollToBookings}
        />
      )}
      <p className="kicker text-muted-foreground">Plan &amp; reserve</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand-600">Book Your Trip</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Bookings are made from a completed Trip Plan — pick a plan that&apos;s ready to go,
        confirm your traveller details, and we&apos;ll take care of the rest.
      </p>

      {!selectedPlan ? (
        <div className="mt-8">
          {!mounted ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : rawSelectedPlan ? (
            <EmptyState
              icon={BookOpen}
              title={rawSelectedPlan.bookingId ? "This trip plan is already booked" : "This trip plan isn't ready to book yet"}
              description={
                rawSelectedPlan.bookingId
                  ? "Check My Bookings or Travel Tracking for its status."
                  : "It needs at least one destination, a start date, and a \"Ready\" status in the Trip Planner first."
              }
              action={
                rawSelectedPlan.bookingId
                  ? { label: "View my bookings", href: "#your-bookings" }
                  : { label: "Open in Trip Planner", href: "/planner" }
              }
            />
          ) : bookablePlans.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No trip plans ready to book"
              description="Build a trip plan in the Trip Planner and mark it Ready — then you can book it here."
              action={{ label: "Go to Trip Planner", href: "/planner" }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookablePlans.map((p) => {
                const d = destinations.find((x) => x.id === p.destinationIds[0]);
                return (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/booking?planId=${p.id}`)}
                    className="rounded-2xl border border-border bg-white p-5 text-left shadow-soft transition hover:border-secondary hover:shadow-md"
                  >
                    <p className="font-semibold text-brand-600">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d?.name ?? "No destination set"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {p.startDate ? formatDate(p.startDate) : "—"}
                      {p.endDate && ` – ${formatDate(p.endDate)}`}
                      {" · "}{p.travelers} traveler{p.travelers !== 1 ? "s" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ── Form ── */}
          <div className="space-y-6 rounded-2xl border border-border bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking</p>
                <p className="font-display text-lg font-bold text-brand-600">{selectedPlan.title}</p>
              </div>
              <Link href="/booking" className="flex items-center gap-1 text-xs font-medium text-secondary hover:underline">
                <ArrowLeft size={12} /> Choose a different plan
              </Link>
            </div>

            {/* Read-only plan summary — already captured in the Trip Planner, never re-asked here */}
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} /> Destination</dt>
                <dd className="mt-0.5 font-medium">{destination?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={12} /> Travelers</dt>
                <dd className="mt-0.5 font-medium">{selectedPlan.travelers}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays size={12} /> Travel date</dt>
                <dd className="mt-0.5 font-medium">{selectedPlan.startDate ? formatDate(selectedPlan.startDate) : "—"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays size={12} /> Return date</dt>
                <dd className="mt-0.5 font-medium">{selectedPlan.endDate ? formatDate(selectedPlan.endDate) : "—"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Wallet size={12} /> Budget</dt>
                <dd className="mt-0.5 font-medium">{formatCurrency(selectedPlan.budget)}</dd>
              </div>
            </dl>

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

            <div className="border-t border-border pt-5">
              <p className="text-sm font-semibold text-foreground">Traveller information</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Required for your booking confirmation.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <TextField label="Full name" required value={fullName} onChange={setFullName} />
                <TextField label="Phone number" required value={phone} onChange={setPhone} />
                <TextField label="Emergency contact name" required value={emergencyContactName} onChange={setEmergencyContactName} />
                <TextField label="Emergency contact number" required value={emergencyContactNumber} onChange={setEmergencyContactNumber} />
                <div className="space-y-1.5">
                  <label htmlFor="booking-field-email" className="text-sm font-medium text-foreground">Email</label>
                  <input
                    id="booking-field-email"
                    type="text"
                    value={user?.email ?? ""}
                    disabled
                    className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground outline-none"
                  />
                </div>
                <TextField label="Nationality (optional)" value={nationality} onChange={setNationality} />
                <TextField label="Passport number (optional)" value={passportNumber} onChange={setPassportNumber} />
              </div>
              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Medical information <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea
                  value={medicalInfo}
                  onChange={(e) => setMedicalInfo(e.target.value)}
                  rows={2}
                  placeholder="Allergies, conditions, medication, etc."
                  className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Special requirements <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  rows={2}
                  placeholder="Accessibility needs, dietary requirements, etc."
                  className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything else we should know?"
                  className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <Button
              variant="accent"
              className="w-full"
              disabled={!canSave || createBooking.isPending}
              onClick={handleSave}
            >
              {createBooking.isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Booking…</>
              ) : (
                "Confirm booking"
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

                  {selectedPlan.budget > 0 && (
                    <p className={cn(
                      "flex items-center gap-1.5 text-xs font-medium",
                      overBudget ? "text-destructive" : "text-success"
                    )}>
                      {overBudget ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                      {overBudget
                        ? `${formatCurrency(estimatedCost - selectedPlan.budget)} over your plan's budget`
                        : `Within your plan's budget (${formatCurrency(selectedPlan.budget - estimatedCost)} to spare)`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">This plan has no destination set.</p>
              )}
            </div>

            {recommendedGuides.length > 0 && (
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
      )}

      {/* ── Your bookings ── */}
      {mounted && (
        <div id="your-bookings" className="mt-12 scroll-mt-24">
          <h2 className="font-display text-xl font-bold text-brand-600">Your bookings</h2>
          {bookings.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={BookOpen} title="No bookings yet" description="Bookings you confirm will show up here." />
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
                          Ref #{b.id.slice(-8).toUpperCase()} · {b.fullName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(b.travelDate)} · {b.travelers} traveler{b.travelers > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge variant={b.status === "cancelled" ? "destructive" : b.status === "confirmed" || b.status === "completed" ? "success" : "accent"}>
                        {b.status === "pending" ? "Awaiting review" : b.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{b.accommodationType} · {b.transportPreference}</span>
                      <span className="font-semibold text-brand-600">{formatCurrency(b.estimatedCost)}</span>
                    </div>
                    {(b.status === "pending" || b.status === "confirmed") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => setPendingCancelId(b.id)}
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
