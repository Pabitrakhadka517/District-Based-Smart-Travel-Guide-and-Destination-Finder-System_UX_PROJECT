"use client";
import { useEffect, useRef, useState } from "react";
import { X, User as UserIcon, MapPin, CalendarDays, Wallet, StickyNote, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { apiGet } from "@/services/api-client";
import type { Booking, BookingDetail } from "@/types";

interface Props {
  bookingId: string | null;
  onClose: () => void;
}

const STATUS_BADGE: Record<Booking["status"], "success" | "accent" | "outline" | "secondary"> = {
  confirmed: "success",
  pending: "accent",
  completed: "secondary",
  cancelled: "outline",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function Section({ icon: Icon, title, children }: { icon: typeof UserIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-600">
        <Icon size={15} /> {title}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === "" || value === null || value === undefined) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function BookingDetailsModal({ bookingId, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useFocusTrap(!!bookingId, dialogRef, onClose);

  useEffect(() => {
    if (!bookingId) return;
    setDetail(null);
    setError(null);
    setNotFound(false);
    setLoading(true);

    apiGet<BookingDetail>(`/admin/bookings/${bookingId}`, true)
      .then(setDetail)
      .catch((e) => {
        const message = e instanceof Error ? e.message : "Failed to load booking details";
        if (/not found/i.test(message)) setNotFound(true);
        else setError(message);
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (!bookingId) return null;

  const b = detail?.booking;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-title"
      tabIndex={-1}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
          <div>
            <h2 id="booking-detail-title" className="font-display text-lg font-semibold text-brand-600">
              Booking details
            </h2>
            {b && <p className="text-xs text-muted-foreground">#{b.id}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking details"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading booking details…
            </div>
          )}

          {!loading && notFound && (
            <Alert variant="warning">Booking not found. It may have been deleted.</Alert>
          )}

          {!loading && error && <Alert variant="error">{error}</Alert>}

          {!loading && b && (
            <>
              {/* Booking Overview */}
              <Section icon={CalendarDays} title="Booking Overview">
                <Row label="Booking ID" value={b.id} />
                <Row label="Status" value={<Badge variant={STATUS_BADGE[b.status]} className="capitalize">{b.status}</Badge>} />
                <Row label="Booking type" value="Trip plan booking" />
                <Row label="Travelers" value={b.travelers} />
                <Row label="Trip plan ID" value={b.tripPlanId} />
              </Section>

              {/* Customer Information */}
              <Section icon={UserIcon} title="Customer Information">
                <Row label="Full name" value={b.fullName} />
                <Row label="Email" value={b.email} />
                <Row label="Phone" value={b.phone} />
                <Row label="User ID" value={detail?.user?.id ?? b.userId} />
                {detail?.user && (
                  <>
                    <Row label="Account joined" value={detail.user.joinedAt} />
                    <Row label="Account status" value={detail.user.isActive ? "Active" : "Deactivated"} />
                  </>
                )}
                {!detail?.user && (
                  <p className="text-xs text-muted-foreground">
                    This user&apos;s account no longer exists — showing the details captured at booking time.
                  </p>
                )}
                <Row label="Emergency contact" value={b.emergencyContactName} />
                <Row label="Emergency phone" value={b.emergencyContactNumber} />
                <Row label="Nationality" value={b.nationality} />
                <Row label="Passport number" value={b.passportNumber} />
              </Section>

              {/* Destination Information */}
              <Section icon={MapPin} title="Destination Information">
                {detail?.destination ? (
                  <div className="flex gap-3">
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <CloudinaryImage
                        image={detail.destination.heroImage}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Row label="Destination" value={detail.destination.name} />
                      <Row label="District" value={detail.destination.district?.name} />
                      <Row label="City / location" value={detail.destination.city?.name} />
                      <Row label="Category" value={detail.destination.category} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Destination not found — it may have been removed.</p>
                )}
              </Section>

              {/* Travel / Booking Details */}
              <Section icon={CalendarDays} title="Travel / Booking Details">
                <Row label="Travel date" value={b.travelDate} />
                <Row label="Return date" value={b.returnDate} />
                <Row label="Accommodation" value={b.accommodationType} />
                <Row label="Transport" value={b.transportPreference} />
                <Row label="Budget" value={`NPR ${b.budget.toLocaleString()}`} />
              </Section>

              {/* Payment Information */}
              <Section icon={Wallet} title="Payment Information">
                <Row label="Estimated cost" value={`NPR ${b.estimatedCost.toLocaleString()}`} />
              </Section>

              {/* Additional Notes */}
              {(b.notes || b.specialRequirements || b.medicalInfo) && (
                <Section icon={StickyNote} title="Additional Notes">
                  <Row label="Notes" value={b.notes} />
                  <Row label="Special requirements" value={b.specialRequirements} />
                  <Row label="Medical info" value={b.medicalInfo} />
                </Section>
              )}

              {/* Booking Timeline / Metadata */}
              <Section icon={History} title="Booking Timeline">
                <Row label="Created" value={formatDateTime(b.createdAt)} />
                <Row label="Last updated" value={formatDateTime(b.updatedAt)} />
                {b.status === "cancelled" && (
                  <Row label="Cancelled" value={`As of ${formatDateTime(b.updatedAt)}`} />
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
