import type { Request, Response } from "express";
import { TripPlan } from "../models/TripPlan";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, sanitizeGallery } from "../utils/sanitize";
import { cleanupReplacedImages } from "../services/cloudinary.service";

const TRIP_FIELDS = [
  "title", "travelType", "travelers",
  "destinationIds", "startDate", "endDate",
  "budget", "budgetBreakdown",
  "status", "notes", "itinerary", "checklist", "photos",
];

const VALID_STATUSES = ["draft", "planned", "ready", "ongoing", "completed", "cancelled"];
const VALID_TYPES    = ["Adventure", "Trekking", "Cultural", "Religious", "Family", "Wildlife", "Luxury", "Budget"];
const DATE_RE        = /^\d{4}-\d{2}-\d{2}$/;

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
    destinationIds:  Array.isArray(body.destinationIds) ? body.destinationIds : [],
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

  const needsExisting =
    body.photos !== undefined || body.startDate !== undefined || body.endDate !== undefined || body.status !== undefined;
  const existing = needsExisting
    ? await TripPlan.findOne({ id: req.params.id, userId: req.auth!.sub }).select("photos startDate endDate status").lean()
    : null;

  if (body.startDate !== undefined || body.endDate !== undefined) {
    if (!existing) return fail(res, "Trip not found", 404);
    const effectiveStart = body.startDate !== undefined ? String(body.startDate) : existing.startDate;
    const effectiveEnd   = body.endDate   !== undefined ? String(body.endDate)   : existing.endDate;
    if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart)
      return fail(res, "endDate cannot be before startDate", 400);
  }

  // A completed trip's status is locked — Tracking and Planner both write this
  // same field from separate UIs, and without this a trip could silently
  // un-complete itself (e.g. opening it in the Planner workspace resets the
  // status dropdown to draft/planned/ready).
  if (body.status !== undefined && existing?.status === "completed" && body.status !== "completed") {
    return fail(res, "A completed trip's status can't be changed", 400);
  }

  const trip = await TripPlan.findOneAndUpdate(
    { id: req.params.id, userId: req.auth!.sub },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!trip) return fail(res, "Trip not found", 404);
  if (existing && body.photos !== undefined) cleanupReplacedImages([existing.photos], [trip.photos]);
  ok(res, trip);
});

// DELETE /api/planner/:id  (auth)
export const deleteTrip = asyncHandler(async (req: Request, res: Response) => {
  const trip = await TripPlan.findOneAndDelete({ id: req.params.id, userId: req.auth!.sub });
  if (!trip) return fail(res, "Trip not found", 404);
  cleanupReplacedImages([trip.photos], []);
  ok(res, { id: req.params.id, deleted: true });
});
