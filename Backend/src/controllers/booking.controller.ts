import type { Request, Response } from "express";
import { Booking } from "../models/Booking";
import { Destination } from "../models/Destination";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId, today } from "../utils/ids";
import { parsePagination } from "../utils/pagination";
import { qs } from "../utils/sanitize";

const VALID_ACCOMMODATION = ["Budget", "Standard", "Luxury"] as const;
const VALID_TRANSPORT = ["Local Bus", "Private Jeep", "Domestic Flight"] as const;
const VALID_STATUSES = ["pending", "confirmed", "cancelled"] as const;
// A user acting on their own booking may only cancel it — moving a booking to
// "confirmed" requires admin review via the /admin/bookings endpoints below.
const USER_ALLOWED_STATUSES = ["cancelled"] as const;
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
    Booking.find(filter).sort({ travelDate: 1 }).skip(skip).limit(limit),
    Booking.countDocuments(filter)
  ]);
  okPaginated(res, bookings, total, page, limit);
});

// POST /api/bookings  (requireAuth)
export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};

  const destinationId = String(body.destinationId ?? "");
  if (!destinationId) return fail(res, "destinationId is required", 400);
  const destination = await Destination.findOne({ id: destinationId });
  if (!destination) return fail(res, "Destination not found", 404);

  const travelDate = String(body.travelDate ?? "");
  if (!DATE_RE.test(travelDate)) return fail(res, "travelDate must be YYYY-MM-DD", 400);
  if (travelDate < today()) return fail(res, "travelDate cannot be in the past", 400);

  const travelers = Number(body.travelers ?? 1);
  if (!Number.isFinite(travelers) || travelers < 1) return fail(res, "travelers must be a positive number", 400);

  const budget = Number(body.budget ?? 0);
  if (!Number.isFinite(budget) || budget < 0) return fail(res, "budget must be a non-negative number", 400);

  const accommodationType = String(body.accommodationType ?? "Standard");
  if (!VALID_ACCOMMODATION.includes(accommodationType as (typeof VALID_ACCOMMODATION)[number])) {
    return fail(res, `accommodationType must be one of: ${VALID_ACCOMMODATION.join(", ")}`, 400);
  }

  const transportPreference = String(body.transportPreference ?? "Local Bus");
  if (!VALID_TRANSPORT.includes(transportPreference as (typeof VALID_TRANSPORT)[number])) {
    return fail(res, `transportPreference must be one of: ${VALID_TRANSPORT.join(", ")}`, 400);
  }

  const estimatedCost = estimateCost(
    travelers,
    accommodationType as (typeof VALID_ACCOMMODATION)[number],
    transportPreference as (typeof VALID_TRANSPORT)[number]
  );

  const booking = await Booking.create({
    id: genId("bk"),
    userId: req.auth!.sub,
    destinationId,
    travelDate,
    travelers,
    budget,
    accommodationType,
    transportPreference,
    estimatedCost,
    status: "pending",
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : ""
  });

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

  const booking = await Booking.findOneAndUpdate(
    { id: req.params.id, userId: req.auth!.sub },
    { $set: { status } },
    { new: true, runValidators: true }
  );
  if (!booking) return fail(res, "Booking not found", 404);
  ok(res, booking);
});

// DELETE /api/bookings/:id  (requireAuth, own booking only)
export const deleteBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findOneAndDelete({ id: req.params.id, userId: req.auth!.sub });
  if (!booking) return fail(res, "Booking not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});

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
    Booking.find(filter).sort({ travelDate: 1 }).skip(skip).limit(limit),
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

  const booking = await Booking.findOneAndUpdate(
    { id: req.params.id },
    { $set: { status } },
    { new: true, runValidators: true }
  );
  if (!booking) return fail(res, "Booking not found", 404);
  ok(res, booking);
});

// DELETE /api/admin/bookings/:id  (requireAdmin) — any user's booking
export const adminDeleteBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findOneAndDelete({ id: req.params.id });
  if (!booking) return fail(res, "Booking not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
