"use client";
import Link from "next/link";
import { CheckCircle2, CalendarCheck, Sparkles, ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking, Destination, GuideArticle } from "@/types";

export interface BookingConfirmationProps {
  booking: Booking;
  destination: Destination;
  guide?: GuideArticle;
  onClose: () => void;
  onViewBookings: () => void;
}

export function BookingConfirmation({
  booking, destination, guide, onClose, onViewBookings,
}: BookingConfirmationProps) {
  const reference = booking.id.slice(-8).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="booking-confirmation-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
            <CheckCircle2 size={28} />
          </span>
          <h2 id="booking-confirmation-title" className="mt-4 font-display text-2xl font-bold text-brand-600">
            Booking confirmed!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your trip to {destination.name} is all set.
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
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Accommodation</dt>
            <dd className="font-medium">{booking.accommodationType}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Transport</dt>
            <dd className="font-medium">{booking.transportPreference}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3 border-t border-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s next</p>
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

        <div className="mt-6 flex gap-3">
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
