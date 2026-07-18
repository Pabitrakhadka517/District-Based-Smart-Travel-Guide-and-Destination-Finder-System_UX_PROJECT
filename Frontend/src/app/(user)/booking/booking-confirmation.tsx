"use client";
import Link from "next/link";
import { CheckCircle2, Clock, CalendarCheck, Sparkles, ClipboardList, X, Printer, LayoutDashboard, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Booking, Destination, GuideArticle } from "@/types";

export interface BookingConfirmationProps {
  booking: Booking;
  destination: Destination;
  guide?: GuideArticle;
  onClose: () => void;
  onViewBookings: () => void;
}

// A new booking always starts out "pending" — an admin still has to review
// and approve it (see Backend/booking.controller.ts's state machine) — so
// this can't unconditionally celebrate a "confirmed" booking the moment the
// form is submitted. Branching on the real status keeps this dialog honest
// if it's ever reopened for an already-reviewed booking too.
const STATUS_COPY: Record<Booking["status"], { title: string; body: (destinationName: string) => string }> = {
  pending: {
    title: "Booking request submitted!",
    body: (name) => `We've sent your request for ${name} to our team — you'll get an email as soon as it's reviewed and confirmed.`,
  },
  confirmed: {
    title: "Booking confirmed!",
    body: (name) => `Your trip to ${name} is all set.`,
  },
  completed: {
    title: "Trip completed",
    body: (name) => `Your trip to ${name} is marked completed.`,
  },
  cancelled: {
    title: "Booking cancelled",
    body: (name) => `This booking for ${name} was cancelled.`,
  },
};

export function BookingConfirmation({
  booking, destination, guide, onClose, onViewBookings,
}: BookingConfirmationProps) {
  const reference = booking.id.slice(-8).toUpperCase();
  const isPending = booking.status === "pending";
  const copy = STATUS_COPY[booking.status];

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:static print:block print:bg-white print:p-0 print:backdrop-blur-none"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="booking-confirmation-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8 print:max-w-full print:rounded-none print:shadow-none">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground print:hidden"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className={cn(
            "grid h-14 w-14 place-items-center rounded-full",
            isPending ? "bg-secondary/10 text-secondary" : "bg-success/10 text-success"
          )}>
            {isPending ? <Clock size={28} /> : <CheckCircle2 size={28} />}
          </span>
          <h2 id="booking-confirmation-title" className="mt-4 font-display text-2xl font-bold text-brand-600">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.body(destination.name)}
          </p>
          <span className="mt-3 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
            Booking reference #{reference}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-border p-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
            <CloudinaryImage
              image={destination.heroImage}
              alt={destination.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-600">{destination.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(booking.travelDate)} · {booking.travelers} traveler{booking.travelers > 1 ? "s" : ""}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold text-brand-600">{formatCurrency(booking.estimatedCost)}</p>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          {booking.returnDate && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Return date</dt>
              <dd className="font-medium">{formatDate(booking.returnDate)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Traveller</dt>
            <dd className="font-medium">{booking.fullName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{booking.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium capitalize">{booking.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Accommodation</dt>
            <dd className="font-medium">{booking.accommodationType}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Transport</dt>
            <dd className="font-medium">{booking.transportPreference}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3 border-t border-border pt-5 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s next</p>
          {isPending && (
            <div className="flex items-start gap-2.5 text-sm">
              <Clock size={16} className="mt-0.5 shrink-0 text-brand-600" />
              <span>Our team will review your request — we&apos;ll email you the moment it&apos;s confirmed.</span>
            </div>
          )}
          <div className="flex items-start gap-2.5 text-sm">
            <ClipboardList size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <span>Saved to <strong>My Bookings</strong> below — you can review or cancel it anytime.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm">
            <CalendarCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <span>Mark <strong>{formatDate(booking.travelDate)}</strong> on your calendar.</span>
          </div>
          {guide && (
            <div className="flex items-start gap-2.5 text-sm">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
              <span>
                Start planning with{" "}
                <Link href={`/guides/${guide.slug}`} className="font-medium text-brand-600 hover:underline">
                  {guide.title}
                </Link>
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={14} /> Print
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="w-full">
              <LayoutDashboard size={14} /> Dashboard
            </Button>
          </Link>
          <Link href="/tracking" className="col-span-2">
            <Button variant="outline" size="sm" className="w-full">
              <Route size={14} /> Travel Tracking
            </Button>
          </Link>
        </div>

        <div className="mt-3 flex gap-3 print:hidden">
          <Button variant="outline" className="flex-1" onClick={onViewBookings}>
            View my bookings
          </Button>
          <Button variant="accent" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
