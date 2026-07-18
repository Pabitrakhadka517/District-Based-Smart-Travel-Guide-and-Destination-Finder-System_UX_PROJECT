import type { Request, Response } from "express";
import { Review } from "../models/Review";
import { TripPlan } from "../models/TripPlan";
import { User } from "../models/User";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId, today } from "../utils/ids";
import { qs, sanitizeGallery } from "../utils/sanitize";
import { parsePagination } from "../utils/pagination";
import { PLACEHOLDER } from "../services/cloudinary.service";
import { recomputeDestinationRating } from "../services/rating.service";
import { createNotification, ADMIN_BROADCAST_USER_ID } from "../services/notification.service";

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

  const { page, limit, skip } = parsePagination(req.query, 200);
  const [result, total] = await Promise.all([
    Review.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter)
  ]);
  okPaginated(res, result, total, page, limit);
});

// POST /api/reviews   (requireAuth)
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.destinationId) return fail(res, "destinationId is required", 400);

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail(res, "rating must be an integer between 1 and 5", 400);
  }

  const userId = req.auth!.sub;
  const destinationId = String(body.destinationId);

  // Prevent duplicate reviews from the same user
  const existing = await Review.exists({ destinationId, userId });
  if (existing) return fail(res, "You have already submitted a review for this destination", 409);

  // Only users who have this destination in one of their trip plans may review it
  const hasTrip = await TripPlan.exists({ userId, destinationIds: destinationId });
  if (!hasTrip) {
    return fail(res, "You can only review destinations that are part of one of your trip plans", 403);
  }

  // Validate photos: accept array of image objects (already uploaded via /api/upload/gallery), max 5
  const photos = sanitizeGallery(body.photos, 5);

  // Use the authenticated user's real name and avatar — never trust client-supplied values
  const reviewer = await User.findOne({ id: userId }).select("name avatar").lean();

  const created = await Review.create({
    id:               genId("r"),
    userId,
    destinationId,
    author:           reviewer?.name   ?? "Anonymous",
    avatar:           reviewer?.avatar ?? { url: PLACEHOLDER.avatar.url, publicId: PLACEHOLDER.avatar.publicId, alt: "Anonymous traveler" },
    rating,
    title:  typeof body.title === "string" ? body.title.trim().slice(0, 200)  : "",
    body:   typeof body.body  === "string" ? body.body.trim().slice(0, 5000)  : "",
    date:   today(),
    helpful:          0,
    status:           "pending",
    photos,
    verifiedTraveler: true
  });

  await createNotification({
    userId: ADMIN_BROADCAST_USER_ID,
    type: "review_pending",
    message: "A new review is pending moderation",
    link: "/admin/reviews"
  });

  ok(res, created, 201);
});

// PATCH /api/reviews/:id  (requireAuth — author only)
// Editing content re-queues the review for moderation, since the previously
// approved text/rating no longer reflects what's actually stored.
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findOne({ id: req.params.id }).select("userId destinationId").lean();
  if (!review) return fail(res, "Review not found", 404);
  if (review.userId !== req.auth!.sub) {
    return fail(res, "You can only edit your own reviews", 403);
  }

  const body = req.body ?? {};
  const update: Record<string, unknown> = { status: "pending" };

  if (body.rating !== undefined) {
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return fail(res, "rating must be an integer between 1 and 5", 400);
    }
    update.rating = rating;
  }
  if (body.title !== undefined) {
    update.title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  }
  if (body.body !== undefined) {
    update.body = typeof body.body === "string" ? body.body.trim().slice(0, 5000) : "";
  }
  if (body.photos !== undefined) {
    update.photos = sanitizeGallery(body.photos, 5);
  }

  const updated = await Review.findOneAndUpdate({ id: req.params.id }, update, { new: true, runValidators: true }).lean();
  await recomputeDestinationRating(review.destinationId);
  ok(res, updated);
});

// PATCH /api/reviews/:id/status  { status }  (admin)
export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body ?? {};
  if (!VALID_STATUSES.includes(status)) {
    return fail(res, "status must be approved, pending or rejected", 400);
  }

  const review = await Review.findOneAndUpdate({ id: req.params.id }, { status }, { new: true }).lean();
  if (!review) return fail(res, "Review not found", 404);

  await recomputeDestinationRating(review.destinationId);
  ok(res, review);
});

// DELETE /api/reviews/:id  (requireAuth — author or admin)
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findOne({ id: req.params.id }).select("userId destinationId").lean();
  if (!review) return fail(res, "Review not found", 404);

  const isOwner = review.userId === req.auth!.sub;
  const isAdmin = req.auth!.role === "admin";
  if (!isOwner && !isAdmin) {
    return fail(res, "You can only delete your own reviews", 403);
  }

  await Review.deleteOne({ id: req.params.id });
  await recomputeDestinationRating(review.destinationId);
  ok(res, { id: req.params.id, deleted: true });
});

// POST /api/reviews/:id/helpful  (requireAuth)
// One vote per user, enforced atomically server-side via helpfulVoterIds —
// the filter only matches (and only then increments) if this user hasn't
// already voted, so a scripted repeat request can't inflate the count.
export const voteHelpful = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;

  const updated = await Review.findOneAndUpdate(
    { id: req.params.id, helpfulVoterIds: { $ne: userId } },
    { $addToSet: { helpfulVoterIds: userId }, $inc: { helpful: 1 } },
    { new: true }
  ).select("helpful").lean();

  if (updated) return ok(res, { helpful: updated.helpful });

  // Either the review doesn't exist, or this user already voted — either way,
  // no new vote is recorded; just report the current count if it exists.
  const existing = await Review.findOne({ id: req.params.id }).select("helpful").lean();
  if (!existing) return fail(res, "Review not found", 404);
  ok(res, { helpful: existing.helpful });
});
