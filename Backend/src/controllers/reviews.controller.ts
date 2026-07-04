import type { Request, Response } from "express";
import { Review } from "../models/Review";
import { Destination } from "../models/Destination";
import { TripPlan } from "../models/TripPlan";
import { User } from "../models/User";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId, today } from "../utils/ids";
import { qs, sanitizeGallery } from "../utils/sanitize";

const VALID_STATUSES = ["approved", "pending", "rejected"] as const;

// GET /api/reviews?destination=<destinationId>&status=<status>&user=<userId>
// Non-admin users always receive only approved reviews, unless querying their own via ?user=<self>.
export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const destination = qs(req.query.destination);
  const statusParam = qs(req.query.status);
  const userParam   = qs(req.query.user);
  const isAdmin     = req.auth?.role === "admin";

  const filter: Record<string, unknown> = {};
  if (destination) filter.destinationId = destination;

  // A logged-in user may query their own reviews (any status) via ?user=<their id>
  if (userParam && req.auth?.sub && userParam === req.auth.sub) {
    filter.userId = req.auth.sub;
    // No status restriction — user sees their own reviews at any status
  } else if (isAdmin) {
    // Admin sees all reviews; optionally filter by specific status
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as typeof VALID_STATUSES[number])) {
        return fail(res, "status must be approved, pending or rejected", 400);
      }
      filter.status = statusParam;
    }
    // No status filter → admin sees all statuses
  } else {
    filter.status = "approved"; // Public always sees only approved reviews
  }

  const result = await Review.find(filter).sort({ date: -1 }).limit(200);
  ok(res, result);
});

// POST /api/reviews   (requireAuth)
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.destinationId) return fail(res, "destinationId is required", 400);

  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return fail(res, "rating must be an integer between 1 and 5", 400);
  }

  const userId = req.auth!.sub;
  const destinationId = String(body.destinationId);

  // Prevent duplicate reviews from the same user
  const existing = await Review.findOne({ destinationId, userId });
  if (existing) return fail(res, "You have already submitted a review for this destination", 409);

  // Check if the user has a trip plan that includes this destination (verified traveler)
  const hasTrip = await TripPlan.exists({ userId, destinationIds: destinationId });

  // Validate photos: accept array of image objects (already uploaded via /api/upload/gallery), max 5
  const photos = sanitizeGallery(body.photos, 5);

  // Use the authenticated user's real name and avatar — never trust client-supplied values
  const reviewer = await User.findOne({ id: userId });

  const created = await Review.create({
    id:               genId("r"),
    userId,
    destinationId,
    author:           reviewer?.name   ?? "Anonymous",
    avatar:           reviewer?.avatar ?? { url: "https://i.pravatar.cc/150?img=3", publicId: null, alt: "Anonymous traveler" },
    rating,
    title:  typeof body.title === "string" ? body.title.trim().slice(0, 200)  : "",
    body:   typeof body.body  === "string" ? body.body.trim().slice(0, 5000)  : "",
    date:   today(),
    helpful:          0,
    status:           "pending",
    photos,
    verifiedTraveler: Boolean(hasTrip)
  });

  ok(res, created, 201);
});

// PATCH /api/reviews/:id/status  { status }  (admin)
export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body ?? {};
  if (!VALID_STATUSES.includes(status)) {
    return fail(res, "status must be approved, pending or rejected", 400);
  }

  const review = await Review.findOneAndUpdate({ id: req.params.id }, { status }, { new: true });
  if (!review) return fail(res, "Review not found", 404);

  await recomputeDestinationRating(review.destinationId);
  ok(res, review);
});

// DELETE /api/reviews/:id  (admin)
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findOneAndDelete({ id: req.params.id });
  if (!review) return fail(res, "Review not found", 404);
  await recomputeDestinationRating(review.destinationId);
  ok(res, { id: req.params.id, deleted: true });
});

// POST /api/reviews/:id/helpful  (requireAuth)
// Double-vote prevention is handled on the frontend via localStorage.
export const voteHelpful = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findOneAndUpdate(
    { id: req.params.id },
    { $inc: { helpful: 1 } },
    { new: true }
  );
  if (!review) return fail(res, "Review not found", 404);
  ok(res, { helpful: review.helpful });
});

// Uses aggregation instead of fetching full documents — O(n) → O(1) DB work
async function recomputeDestinationRating(destinationId: string): Promise<void> {
  const [result] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { destinationId, status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);

  if (!result) return; // No approved reviews — leave current rating intact
  await Destination.updateOne(
    { id: destinationId },
    { rating: Math.round(result.avg * 10) / 10, reviewCount: result.count }
  );
}
