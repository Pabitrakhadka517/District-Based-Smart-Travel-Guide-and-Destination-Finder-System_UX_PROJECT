import type { Request, Response } from "express";
import { TripPlan } from "../models/TripPlan";
import { Booking } from "../models/Booking";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, sanitizeGallery } from "../utils/sanitize";
import { cleanupReplacedImages } from "../services/cloudinary.service";

const TRIP_FIELDS = [
  "title", "travelType", "travelers",
  "districtId", "destinationIds", "attractionIds", "trekIds",
  "startDate", "endDate",
  "budget", "budgetBreakdown",
  "status", "notes", "itinerary", "checklist", "photos",
];

// Matches the full TripPlan schema enum (see models/TripPlan.ts) — "booked"
// belongs here too, or any full-object save that resends a plan's current
// "booked" status (which every save in this app does, since payloads are
// always the whole object) fails this very check before it can even reach
// the more specific "booked can only come from createBooking" guard below.
const VALID_STATUSES = ["draft", "planned", "ready", "booked", "ongoing", "completed", "cancelled"];
const VALID_TYPES    = ["Adventure", "Trekking", "Cultural", "Religious", "Family", "Wildlife", "Luxury", "Budget"];
const DATE_RE        = /^\d{4}-\d{2}-\d{2}$/;

// The fields that form the Booking snapshot at booking time (see
// createBooking in booking.controller.ts) — once a plan reaches any of
// LOCKED_STATUSES these must stay frozen, or the plan silently drifts away
// from what was actually booked/reserved.
const PLANNING_SNAPSHOT_FIELDS = [
  "title", "travelType", "travelers", "districtId",
  "destinationIds", "attractionIds", "trekIds",
  "startDate", "endDate", "budget", "budgetBreakdown",
] as const;

// Anything past "ready" means a Booking exists (or the trip is finished) —
// Travel Tracking, not the Planner, owns what happens to the plan from here.
const LOCKED_STATUSES = ["booked", "ongoing", "completed", "cancelled"];

function valuesDiffer(a: unknown, b: unknown): boolean {
  if (a === b) return false;
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(a) !== JSON.stringify(b);
  return true;
}

// GET /api/planner  (auth) → TripPlan[] for the current user
export const listTrips = asyncHandler(async (req: Request, res: Response) => {
  const trips = await TripPlan.find({ userId: req.auth!.sub }).sort({ startDate: 1 }).lean();
  ok(res, trips);
});

// POST /api/planner  (auth)
export const createTrip = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.title || typeof body.title !== "string") return fail(res, "title is required", 400);

  if (body.startDate && !DATE_RE.test(String(body.startDate)))
    return fail(res, "startDate must be YYYY-MM-DD", 400);
  if (body.endDate && !DATE_RE.test(String(body.endDate)))
    return fail(res, "endDate must be YYYY-MM-DD", 400);
  if (body.startDate && body.endDate && String(body.endDate) < String(body.startDate))
    return fail(res, "endDate cannot be before startDate", 400);
  if (body.status && !VALID_STATUSES.includes(String(body.status)))
    return fail(res, `status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
  // Unlike updateTrip, there's no existing document here for a "booked"
  // status to legitimately already match — a brand-new plan can never
  // start out booked, since that would claim a Booking exists when it doesn't.
  if (body.status === "booked")
    return fail(res, 'Trip plans can only become "booked" by completing a booking', 400);
  if (body.travelType && !VALID_TYPES.includes(String(body.travelType)))
    return fail(res, `travelType must be one of: ${VALID_TYPES.join(", ")}`, 400);
  if (body.budget !== undefined && (typeof body.budget !== "number" || body.budget < 0))
    return fail(res, "budget must be a non-negative number", 400);
  if (body.travelers !== undefined && (typeof body.travelers !== "number" || body.travelers < 1))
    return fail(res, "travelers must be a positive number", 400);

  const trip = await TripPlan.create({
    id:              genId("t"),
    userId:          req.auth!.sub,
    title:           String(body.title),
    travelType:      String(body.travelType ?? "Adventure"),
    travelers:       Number(body.travelers ?? 1),
    districtId:      String(body.districtId ?? ""),
    destinationIds:  Array.isArray(body.destinationIds) ? body.destinationIds : [],
    attractionIds:   Array.isArray(body.attractionIds) ? body.attractionIds : [],
    trekIds:         Array.isArray(body.trekIds) ? body.trekIds : [],
    startDate:       String(body.startDate ?? ""),
    endDate:         String(body.endDate ?? ""),
    budget:          Number(body.budget ?? 0),
    budgetBreakdown: body.budgetBreakdown && typeof body.budgetBreakdown === "object"
      ? body.budgetBreakdown
      : {},
    status:    String(body.status ?? "draft"),
    notes:     String(body.notes ?? ""),
    itinerary: Array.isArray(body.itinerary) ? body.itinerary : [],
    checklist: Array.isArray(body.checklist) ? body.checklist : [],
    photos: sanitizeGallery(body.photos, 20),
  });

  ok(res, trip, 201);
});

// PUT /api/planner/:id  (auth)
export const updateTrip = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, TRIP_FIELDS);
  if (body.photos !== undefined) body.photos = sanitizeGallery(body.photos, 20);

  if (body.startDate && !DATE_RE.test(String(body.startDate)))
    return fail(res, "startDate must be YYYY-MM-DD", 400);
  if (body.endDate && !DATE_RE.test(String(body.endDate)))
    return fail(res, "endDate must be YYYY-MM-DD", 400);
  if (body.status && !VALID_STATUSES.includes(String(body.status)))
    return fail(res, `status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
  if (body.travelType && !VALID_TYPES.includes(String(body.travelType)))
    return fail(res, `travelType must be one of: ${VALID_TYPES.join(", ")}`, 400);

  const existing = await TripPlan.findOne({ id: req.params.id, userId: req.auth!.sub })
    .select("photos startDate endDate status bookingId title travelType travelers districtId destinationIds attractionIds trekIds budget budgetBreakdown")
    .lean();
  if (!existing) return fail(res, "Trip not found", 404);
  const existingRec = existing as unknown as Record<string, unknown>;

  // Once a plan is booked (or further along), its planning snapshot is
  // frozen so it always matches what was actually booked — only reject
  // fields that are genuinely changing, since the Planner/Tracking UIs
  // routinely resend the whole object unchanged alongside a real edit (e.g.
  // toggling an itinerary activity's `visited` flag), and that must keep
  // working. Checked before the date-range validation below so a locked
  // plan always gets this specific, actionable message instead of a
  // confusing "endDate cannot be before startDate" for an edit that was
  // never going to be allowed anyway.
  if (LOCKED_STATUSES.includes(existing.status)) {
    for (const field of PLANNING_SNAPSHOT_FIELDS) {
      if (body[field] !== undefined && valuesDiffer(body[field], existingRec[field])) {
        return fail(
          res,
          "This trip has been booked — its plan details can't be changed. Cancel the booking first, or create a new trip plan.",
          409
        );
      }
    }
  }

  if (body.startDate !== undefined || body.endDate !== undefined) {
    const effectiveStart = body.startDate !== undefined ? String(body.startDate) : existing.startDate;
    const effectiveEnd   = body.endDate   !== undefined ? String(body.endDate)   : existing.endDate;
    if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart)
      return fail(res, "endDate cannot be before startDate", 400);
  }

  // A completed trip's status is locked — Tracking and Planner both write this
  // same field from separate UIs, and without this a trip could silently
  // un-complete itself (e.g. opening it in the Planner workspace resets the
  // status dropdown to draft/planned/ready).
  if (body.status !== undefined && existing.status === "completed" && body.status !== "completed") {
    return fail(res, "A completed trip's status can't be changed", 400);
  }

  // Everything below only checks *transitions* — the Planner/Tracking UIs
  // routinely resend the trip's current status unchanged alongside an
  // unrelated edit (e.g. Tracking's PhotoPanel spreads the whole trip object
  // just to add a photo), and that must never be treated as an attempted
  // transition.
  const statusChanging = body.status !== undefined && body.status !== existing.status;

  // "booked" may only be set by createBooking (it goes hand-in-hand with a
  // real Booking document and bookingId) — never accept it directly here, or
  // a plan could claim to be booked with no booking behind it.
  if (statusChanging && body.status === "booked") {
    return fail(res, 'Trip plans can only become "booked" by completing a booking', 400);
  }

  // "ongoing" (Tracking's "Start trip") only makes sense from a booked plan
  // whose booking has actually been approved — otherwise a trip could start
  // tracking a journey an admin never confirmed.
  if (statusChanging && body.status === "ongoing") {
    if (existing.status !== "booked") {
      return fail(res, "A trip can only be started once it's booked", 400);
    }
    const linkedBooking = existing.bookingId
      ? await Booking.findOne({ id: existing.bookingId }).select("status").lean()
      : null;
    if (!linkedBooking || linkedBooking.status !== "confirmed") {
      return fail(res, "This trip's booking must be confirmed by an admin before it can start", 400);
    }
  }

  // "completed" (Tracking's "Mark complete") only makes sense once a trip is
  // actually underway.
  if (statusChanging && body.status === "completed" && existing.status !== "ongoing") {
    return fail(res, "A trip can only be completed once it's ongoing", 400);
  }

  // A booked/ongoing/completed trip can't be cancelled through this endpoint —
  // that would desync it from its Booking. Cancelling the booking instead
  // reverts the plan to "ready" via revertTripPlanBooking.
  if (statusChanging && body.status === "cancelled" && ["booked", "ongoing", "completed"].includes(existing.status)) {
    return fail(res, "A booked trip can't be cancelled here — cancel the booking instead", 400);
  }

  const trip = await TripPlan.findOneAndUpdate(
    { id: req.params.id, userId: req.auth!.sub },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!trip) return fail(res, "Trip not found", 404);
  if (body.photos !== undefined) cleanupReplacedImages([existing.photos], [trip.photos]);
  ok(res, trip);
});

// DELETE /api/planner/:id  (auth)
export const deleteTrip = asyncHandler(async (req: Request, res: Response) => {
  const trip = await TripPlan.findOneAndDelete({ id: req.params.id, userId: req.auth!.sub });
  if (!trip) return fail(res, "Trip not found", 404);
  cleanupReplacedImages([trip.photos], []);
  // A deleted plan can't leave a dangling booking pointed at nothing — cancel
  // it (not delete it) so the traveller keeps a record of what happened to it.
  if (trip.bookingId) {
    try {
      await Booking.updateOne({ id: trip.bookingId }, { $set: { status: "cancelled" } });
    } catch (err) {
      console.error("[planner] Failed to cancel booking after trip plan deletion:", err);
    }
  }
  ok(res, { id: req.params.id, deleted: true });
});
