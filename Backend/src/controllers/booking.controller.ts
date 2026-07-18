import type { Request, Response } from "express";
import { Booking } from "../models/Booking";
import { Destination } from "../models/Destination";
import { TripPlan } from "../models/TripPlan";
import { User } from "../models/User";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId, today, shiftDate } from "../utils/ids";
import { parsePagination } from "../utils/pagination";
import { qs } from "../utils/sanitize";
import { sendBookingStatusEmail } from "../services/email.service";

const VALID_ACCOMMODATION = ["Budget", "Standard", "Luxury"] as const;
const VALID_TRANSPORT = ["Local Bus", "Private Jeep", "Domestic Flight"] as const;
const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
// A user acting on their own booking may only cancel it — moving a booking to
// "confirmed" requires admin review via the /admin/bookings endpoints below.
const USER_ALLOWED_STATUSES = ["cancelled"] as const;

// Booking status state machine: pending → confirmed/cancelled,
// confirmed → completed/cancelled. "completed" and "cancelled" are terminal —
// in particular a cancelled booking can never be resurrected back to
// "confirmed" (that would let an admin silently double-book a destination the
// traveller has since rebooked elsewhere; see revertTripPlanBooking).
const BOOKING_STATUS_TRANSITIONS: Record<(typeof VALID_STATUSES)[number], readonly (typeof VALID_STATUSES)[number][]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Returns an error message if `from → to` isn't an allowed transition, null if it's fine.
 *  A same-status "transition" is always allowed as a harmless no-op (e.g. a double-click). */
function invalidBookingTransition(from: string, to: string): string | null {
  if (from === to) return null;
  const allowed = BOOKING_STATUS_TRANSITIONS[from as (typeof VALID_STATUSES)[number]];
  if (!allowed || !allowed.includes(to as (typeof VALID_STATUSES)[number])) {
    return `Booking status can't change from "${from}" to "${to}"`;
  }
  return null;
}

// The unique index on {userId, destinationId, travelDate} only blocks an exact
// duplicate date — nothing stops booking the same destination on every day of
// a week, which is never a real travel plan. Treat a second active booking
// for the same destination within this many days as the same trip.
const NEARBY_BOOKING_WINDOW_DAYS = 7;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Flat per-traveler estimate (NPR) — kept simple and transparent since the
 *  form only collects a single travel date, not a trip length. */
const ACCOMMODATION_RATE: Record<(typeof VALID_ACCOMMODATION)[number], number> = {
  Budget: 2000,
  Standard: 5000,
  Luxury: 12000
};

const TRANSPORT_RATE: Record<(typeof VALID_TRANSPORT)[number], number> = {
  "Local Bus": 1500,
  "Private Jeep": 5000,
  "Domestic Flight": 12000
};

function estimateCost(
  travelers: number,
  accommodationType: (typeof VALID_ACCOMMODATION)[number],
  transportPreference: (typeof VALID_TRANSPORT)[number]
): number {
  return travelers * (ACCOMMODATION_RATE[accommodationType] + TRANSPORT_RATE[transportPreference]);
}

// GET /api/bookings  (requireAuth) → the current user's bookings
export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const filter = { userId: req.auth!.sub };
  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ travelDate: 1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter)
  ]);
  okPaginated(res, bookings, total, page, limit);
});

// POST /api/bookings  (requireAuth) — always created from an existing, ready Trip Plan.
// Destination/dates/travelers/budget are never taken from the request body: they're
// snapshotted straight off the plan so the user is never asked to re-enter data they
// already put into the planner.
export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};

  const tripPlanId = String(body.tripPlanId ?? "");
  if (!tripPlanId) return fail(res, "tripPlanId is required — book a trip plan, not a bare destination", 400);

  const plan = await TripPlan.findOne({ id: tripPlanId, userId: req.auth!.sub });
  if (!plan) return fail(res, "Trip plan not found", 404);
  if (plan.bookingId) return fail(res, "This trip plan has already been booked", 409);
  if (plan.status !== "ready") {
    return fail(res, 'This trip plan must be marked "Ready" before it can be booked — finish planning it first', 400);
  }
  if (!plan.destinationIds.length) {
    return fail(res, "Add at least one destination to this trip plan before booking", 400);
  }
  if (!DATE_RE.test(plan.startDate)) {
    return fail(res, "Set a valid start date on this trip plan before booking", 400);
  }
  if (plan.startDate < today()) {
    return fail(res, "This trip plan's start date is in the past — update it before booking", 400);
  }

  const destinationId = plan.destinationIds[0];
  const destination = await Destination.findOne({ id: destinationId }).lean();
  if (!destination) return fail(res, "Destination not found", 404);

  const nearbyBooking = await Booking.exists({
    userId: req.auth!.sub,
    destinationId,
    status: { $ne: "cancelled" },
    travelDate: {
      $gte: shiftDate(plan.startDate, -NEARBY_BOOKING_WINDOW_DAYS),
      $lte: shiftDate(plan.startDate, NEARBY_BOOKING_WINDOW_DAYS)
    }
  });
  if (nearbyBooking) {
    return fail(
      res,
      `You already have a booking for this destination within ${NEARBY_BOOKING_WINDOW_DAYS} days of this date. Edit or cancel it instead of creating a new one.`,
      409
    );
  }

  const accommodationType = String(body.accommodationType ?? plan.accommodationPreference ?? "Standard");
  if (!VALID_ACCOMMODATION.includes(accommodationType as (typeof VALID_ACCOMMODATION)[number])) {
    return fail(res, `accommodationType must be one of: ${VALID_ACCOMMODATION.join(", ")}`, 400);
  }

  const transportPreference = String(body.transportPreference ?? plan.transportPreference ?? "Local Bus");
  if (!VALID_TRANSPORT.includes(transportPreference as (typeof VALID_TRANSPORT)[number])) {
    return fail(res, `transportPreference must be one of: ${VALID_TRANSPORT.join(", ")}`, 400);
  }

  const fullName = String(body.fullName ?? "").trim();
  if (!fullName) return fail(res, "Full name is required", 400);
  const phone = String(body.phone ?? "").trim();
  if (!phone) return fail(res, "Phone number is required", 400);
  const emergencyContactName = String(body.emergencyContactName ?? "").trim();
  if (!emergencyContactName) return fail(res, "Emergency contact name is required", 400);
  const emergencyContactNumber = String(body.emergencyContactNumber ?? "").trim();
  if (!emergencyContactNumber) return fail(res, "Emergency contact number is required", 400);

  const user = await User.findOne({ id: req.auth!.sub }).select("email").lean();
  if (!user) return fail(res, "User not found", 404);

  const estimatedCost = estimateCost(
    plan.travelers,
    accommodationType as (typeof VALID_ACCOMMODATION)[number],
    transportPreference as (typeof VALID_TRANSPORT)[number]
  );

  const booking = await Booking.create({
    id: genId("bk"),
    userId: req.auth!.sub,
    tripPlanId: plan.id,
    destinationId,
    destinationIds: plan.destinationIds,
    travelDate: plan.startDate,
    returnDate: plan.endDate,
    travelers: plan.travelers,
    budget: plan.budget,
    accommodationType,
    transportPreference,
    estimatedCost,
    status: "pending",
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "",
    fullName,
    phone,
    emergencyContactName,
    emergencyContactNumber,
    email: user.email,
    nationality: typeof body.nationality === "string" ? body.nationality.trim().slice(0, 100) : "",
    passportNumber: typeof body.passportNumber === "string" ? body.passportNumber.trim().slice(0, 50) : "",
    medicalInfo: typeof body.medicalInfo === "string" ? body.medicalInfo.trim().slice(0, 500) : "",
    specialRequirements: typeof body.specialRequirements === "string" ? body.specialRequirements.trim().slice(0, 500) : ""
  });

  // Mark the plan as booked. Non-transactional by design (this codebase has no
  // multi-doc transactions — see cascade.service.ts) but the booking itself is
  // already durably saved above, so a failure here would only leave the plan's
  // status cosmetically stale, never lose the booking.
  try {
    await TripPlan.updateOne({ id: plan.id }, { $set: { status: "booked", bookingId: booking.id } });
  } catch (err) {
    console.error("[booking] Failed to mark trip plan as booked:", err);
  }

  ok(res, booking, 201);
});

// PATCH /api/bookings/:id  (requireAuth, own booking only) — self-service cancel only.
// Moving a booking to "confirmed" is an admin action (see adminUpdateBookingStatus)
// so a user can never approve their own booking.
export const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = String(req.body?.status ?? "");
  if (!USER_ALLOWED_STATUSES.includes(status as (typeof USER_ALLOWED_STATUSES)[number])) {
    return fail(res, `You can only cancel your own booking (status must be "cancelled")`, 403);
  }

  const existing = await Booking.findOne({ id: req.params.id, userId: req.auth!.sub }).select("status").lean();
  if (!existing) return fail(res, "Booking not found", 404);

  const transitionError = invalidBookingTransition(existing.status, status);
  if (transitionError) return fail(res, transitionError, 409);

  const booking = await Booking.findOneAndUpdate(
    { id: req.params.id, userId: req.auth!.sub },
    { $set: { status } },
    { new: true, runValidators: true }
  );
  if (!booking) return fail(res, "Booking not found", 404);
  await revertTripPlanBooking(booking.tripPlanId, booking.id);
  ok(res, booking);
});

// DELETE /api/bookings/:id  (requireAuth, own booking only)
export const deleteBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findOneAndDelete({ id: req.params.id, userId: req.auth!.sub });
  if (!booking) return fail(res, "Booking not found", 404);
  await revertTripPlanBooking(booking.tripPlanId, booking.id);
  ok(res, { id: req.params.id, deleted: true });
});

// Un-links a deleted/cancelled booking from its trip plan so the plan becomes
// bookable again — "bookingId" in the filter guards against reverting a plan
// that's since been re-booked by a race between two requests, and "status:
// booked" guards against corrupting a trip the traveller has already started
// or finished (cancelling a booking after "Start trip" was clicked must not
// yank the plan back to "ready" mid-trip or post-completion).
async function revertTripPlanBooking(tripPlanId: string, bookingId: string): Promise<void> {
  if (!tripPlanId) return;
  try {
    await TripPlan.updateOne(
      { id: tripPlanId, bookingId, status: "booked" },
      { $set: { status: "ready", bookingId: "" } }
    );
  } catch (err) {
    console.error("[booking] Failed to revert trip plan after booking removal:", err);
  }
}

// --- Admin oversight ---

// GET /api/admin/bookings?status=  (requireAdmin) → every user's bookings
export const adminListBookings = asyncHandler(async (req: Request, res: Response) => {
  const status = qs(req.query.status);
  const filter: Record<string, unknown> = {};
  if (status) {
    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return fail(res, `status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }
    filter.status = status;
  }

  const { page, limit, skip } = parsePagination(req.query, 50);
  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ travelDate: 1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter)
  ]);
  okPaginated(res, bookings, total, page, limit);
});

// PATCH /api/admin/bookings/:id  { status }  (requireAdmin) — the only way a
// booking can become "confirmed".
export const adminUpdateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = String(req.body?.status ?? "");
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return fail(res, `status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
  }

  const existing = await Booking.findOne({ id: req.params.id }).select("status").lean();
  if (!existing) return fail(res, "Booking not found", 404);

  const transitionError = invalidBookingTransition(existing.status, status);
  if (transitionError) return fail(res, transitionError, 409);

  const booking = await Booking.findOneAndUpdate(
    { id: req.params.id },
    { $set: { status } },
    { new: true, runValidators: true }
  );
  if (!booking) return fail(res, "Booking not found", 404);

  // Cancelling frees up the trip plan so the traveller can rebook it rather
  // than losing their itinerary work. "Confirmed"/"completed" leave the plan
  // as "booked" — Tracking's own "Start trip"/"Mark complete" flow is what
  // advances the plan's status from there.
  if (status === "cancelled") {
    await revertTripPlanBooking(booking.tripPlanId, booking.id);
  }

  ok(res, booking);

  // Best-effort notification — the status change above is already durably
  // saved, so a missing/misconfigured SMTP transport must never fail the request.
  if (status === "confirmed" || status === "cancelled") {
    void notifyBookingStatusChange(booking, status);
  }
});

async function notifyBookingStatusChange(
  booking: { userId: string; destinationId: string; travelDate: string },
  status: "confirmed" | "cancelled"
): Promise<void> {
  try {
    const [user, destination] = await Promise.all([
      User.findOne({ id: booking.userId }).select("name email").lean(),
      Destination.findOne({ id: booking.destinationId }).select("name").lean()
    ]);
    if (!user) return;
    await sendBookingStatusEmail(user.email, user.name, destination?.name ?? "your destination", booking.travelDate, status);
  } catch (err) {
    console.error("[booking] Failed to send status-change notification email:", err);
  }
}

// DELETE /api/admin/bookings/:id  (requireAdmin) — any user's booking
export const adminDeleteBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findOneAndDelete({ id: req.params.id });
  if (!booking) return fail(res, "Booking not found", 404);
  await revertTripPlanBooking(booking.tripPlanId, booking.id);
  ok(res, { id: req.params.id, deleted: true });
});
