import type { Request, Response } from "express";
import { User } from "../models/User";
import { TripPlan } from "../models/TripPlan";
import { Review } from "../models/Review";
import { Destination } from "../models/Destination";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { qs } from "../utils/sanitize";

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data as T;
}

function setCached(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function countOverlap(tags: string[], refSet: Set<string>): number {
  return tags.filter((t) => refSet.has(t)).length;
}

const DEST_SELECT =
  "id slug name tagline heroImage category tags districtId difficulty rating reviewCount budget trending";

// GET /api/recommendations  (requireAuth)
export const getPersonalized = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as Request & { auth?: { sub: string } }).auth!.sub;
  const cacheKey = `rec:${userId}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return ok(res, cached);

  // recently-viewed destination IDs forwarded from client localStorage
  const viewedParam = qs(req.query.viewed) ?? "";
  const viewedIds = viewedParam
    ? viewedParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10)
    : [];

  const [user, tripPlans, userReviews, allDestinations] = await Promise.all([
    User.findOne({ id: userId }),
    TripPlan.find({ userId }).lean(),
    Review.find({ userId, status: "approved" }).select("destinationId").lean(),
    // Read-only JSON response — .lean() skips Mongoose document hydration for
    // every candidate this scores, which matters here since every destination
    // in the catalog is scanned and scored on each cache-miss request.
    Destination.find({}).select(DEST_SELECT).lean(),
  ]);

  if (!user) return fail(res, "User not found", 404);

  const wishlistIds = new Set<string>(user.wishlist as string[]);
  const wishlistDocs = allDestinations.filter((d) => wishlistIds.has(d.id));

  // Build affinity maps from wishlisted destinations
  const categoryCount: Record<string, number> = {};
  const tagCount: Record<string, number> = {};
  const districtCount: Record<string, number> = {};

  for (const d of wishlistDocs) {
    categoryCount[d.category] = (categoryCount[d.category] ?? 0) + 1;
    districtCount[d.districtId] = (districtCount[d.districtId] ?? 0) + 1;
    for (const tag of (d.tags ?? []) as string[]) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1;
    }
  }

  // Boost district affinity from recently-viewed (half weight)
  for (const viewedId of viewedIds) {
    const doc = allDestinations.find((d) => d.id === viewedId);
    if (doc) districtCount[doc.districtId] = (districtCount[doc.districtId] ?? 0) + 0.5;
  }

  const plannedIds = new Set<string>(
    tripPlans.flatMap((p) => (p.destinationIds ?? []) as string[])
  );
  const reviewedIds = new Set<string>(
    userReviews.map((r) => r.destinationId as string)
  );

  const topTags = new Set<string>(
    Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([t]) => t)
  );

  const maxCat  = Math.max(...Object.values(categoryCount), 1);
  const maxDist = Math.max(...Object.values(districtCount), 1);
  const maxPop  = Math.max(
    ...allDestinations.map((d) => (d.rating as number) * Math.log((d.reviewCount as number) + 1)),
    1
  );

  const scoreMap = new Map<string, number>();
  const candidates = allDestinations.filter((d) => !wishlistIds.has(d.id));

  for (const d of candidates) {
    const overlap = countOverlap((d.tags ?? []) as string[], topTags);
    const score =
      0.35 * (categoryCount[d.category as string] ?? 0) / maxCat +
      0.20 * overlap / Math.max(topTags.size, 1) +
      0.20 * (districtCount[d.districtId as string] ?? 0) / maxDist +
      0.10 * (plannedIds.has(d.id) ? 1 : 0) +
      0.05 * (reviewedIds.has(d.id) ? 1 : 0) +
      0.10 * ((d.rating as number) * Math.log((d.reviewCount as number) + 1)) / maxPop;
    scoreMap.set(d.id, score);
  }

  const results = candidates
    .slice()
    .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
    .slice(0, 12);

  setCached(cacheKey, results, 5 * 60 * 1000);
  ok(res, results);
});

// GET /api/recommendations/similar/:slug  (publicLimiter)
export const getSimilar = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const cacheKey = `similar:${slug}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return ok(res, cached);

  const [src, allDestinations] = await Promise.all([
    Destination.findOne({ slug }).select(DEST_SELECT).lean(),
    Destination.find({}).select(DEST_SELECT).lean(),
  ]);

  if (!src) return fail(res, "Destination not found", 404);

  const srcTags = new Set<string>((src.tags ?? []) as string[]);

  const scoreMap = new Map<string, number>();
  const candidates = allDestinations.filter((d) => d.id !== src.id);

  for (const d of candidates) {
    const overlap = countOverlap((d.tags ?? []) as string[], srcTags);
    const score =
      0.40 * (d.category === src.category ? 1 : 0) +
      0.35 * overlap / Math.max(srcTags.size, 1) +
      0.15 * (d.districtId === src.districtId ? 1 : 0) +
      0.10 * (d.difficulty === src.difficulty ? 1 : 0);
    scoreMap.set(d.id, score);
  }

  const results = candidates
    .slice()
    .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
    .slice(0, 6);

  setCached(cacheKey, results, 10 * 60 * 1000);
  ok(res, results);
});

// GET /api/recommendations/trending  (publicLimiter)
export const getTrending = asyncHandler(async (_req: Request, res: Response) => {
  const cacheKey = "trending";
  const cached = getCached<unknown>(cacheKey);
  if (cached) return ok(res, cached);

  const destinations = await Destination.find({
    $or: [{ trending: true }, { rating: { $gte: 4 } }],
  })
    .select(DEST_SELECT)
    .limit(30)
    .lean();

  const results = destinations
    .slice()
    .sort(
      (a, b) =>
        (b.rating as number) * Math.log((b.reviewCount as number) + 1) -
        (a.rating as number) * Math.log((a.reviewCount as number) + 1)
    )
    .slice(0, 8);

  setCached(cacheKey, results, 15 * 60 * 1000);
  ok(res, results);
});
