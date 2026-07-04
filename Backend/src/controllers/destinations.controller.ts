import type { Request, Response } from "express";
import { Destination } from "../models/Destination";
import { Review } from "../models/Review";
import { Attraction } from "../models/Attraction";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, qs, sanitizeImage, sanitizeGallery } from "../utils/sanitize";
import { getWeatherInsight } from "../services/weather";

const DESTINATION_FIELDS = [
  "slug", "cityId", "districtId", "name", "tagline", "description", "category",
  "tags", "heroImage", "gallery", "coordinates", "rating", "reviewCount",
  "bestTimeToVisit", "budget", "attractions", "activities", "restaurants",
  "localFoods", "travelTips", "pros", "cons", "nearby", "featured", "trending",
  "difficulty", "recommendedDuration"
];

// GET /api/destinations?featured=&trending=&city=<cityId>&category=<Category>&ids=<id1,id2>
export const listDestinations = asyncHandler(async (req: Request, res: Response) => {
  const featured  = req.query.featured;
  const trending  = req.query.trending;
  const city      = qs(req.query.city);
  const category  = qs(req.query.category);
  const idsParam  = qs(req.query.ids);

  const filter: Record<string, unknown> = {};
  if (featured)  filter.featured   = true;
  if (trending)  filter.trending   = true;
  if (city)      filter.cityId     = city;
  if (category)  filter.category   = category;
  if (idsParam)  filter.id         = { $in: idsParam.split(",").map((s) => s.trim()).filter(Boolean) };

  const result = await Destination.find(filter).sort({ rating: -1 }).limit(200);
  ok(res, result);
});

// GET /api/destinations/:slug -> { destination, reviews, nearby, ratingBreakdown, similar, nearbyAttractions }
export const getDestination = asyncHandler(async (req: Request, res: Response) => {
  const destination = await Destination.findOne({ slug: req.params.slug });
  if (!destination) return fail(res, "Destination not found", 404);

  const [reviews, nearby, ratingAgg, similar, nearbyAttractions] = await Promise.all([
    Review.find({ destinationId: destination.id, status: "approved" }).sort({ date: -1 }).limit(50),
    Destination.find({ id: { $in: destination.nearby } }),
    Review.aggregate<{ _id: number; count: number }>([
      { $match: { destinationId: destination.id, status: "approved" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } }
    ]),
    Destination.find({ category: destination.category, id: { $ne: destination.id } })
      .sort({ rating: -1 })
      .limit(4),
    Attraction.find({ districtId: destination.districtId }).sort({ rating: -1 }).limit(6)
  ]);

  const totalReviews = ratingAgg.reduce((sum, r) => sum + r.count, 0);
  const ratingBreakdown = ratingAgg.map((r) => ({
    star:  r._id,
    count: r.count,
    pct:   totalReviews > 0 ? Math.round((r.count / totalReviews) * 100) : 0
  }));

  ok(res, { destination, reviews, nearby, ratingBreakdown, similar, nearbyAttractions });
});

// ─── Weather Insight ──────────────────────────────────────────────────────────

// GET /api/destinations/:slug/weather-insight
export const getDestinationWeatherInsight = asyncHandler(async (req: Request, res: Response) => {
  const destination = await Destination.findOne({ slug: req.params.slug })
    .select("coordinates bestTimeToVisit name");
  if (!destination) return fail(res, "Destination not found", 404);

  const { lat, lng } = destination.coordinates as { lat: number; lng: number };
  const bestTimeToVisit = (destination.bestTimeToVisit ?? []) as string[];

  const insight = await getWeatherInsight(lat, lng, bestTimeToVisit);
  ok(res, insight);
});

// --- Admin CRUD ---

export const createDestination = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, DESTINATION_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  if (body.gallery !== undefined) body.gallery = sanitizeGallery(body.gallery);
  const destination = await Destination.create({ ...body, id: (body.id as string) ?? genId("p") });
  ok(res, destination, 201);
});

export const updateDestination = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, DESTINATION_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  if (body.gallery !== undefined) body.gallery = sanitizeGallery(body.gallery);

  // Slug uniqueness: if slug is changing, ensure no other document uses it
  if (body.slug) {
    const conflict = await Destination.findOne({ slug: body.slug, id: { $ne: req.params.id } });
    if (conflict) return fail(res, `Slug "${body.slug}" is already used by another destination.`, 409);
  }

  const destination = await Destination.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!destination) return fail(res, "Destination not found", 404);
  ok(res, destination);
});

export const deleteDestination = asyncHandler(async (req: Request, res: Response) => {
  const destination = await Destination.findOneAndDelete({ id: req.params.id });
  if (!destination) return fail(res, "Destination not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
