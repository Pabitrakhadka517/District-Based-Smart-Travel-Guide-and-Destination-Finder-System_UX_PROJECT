import type { Request, Response } from "express";
import { Attraction } from "../models/Attraction";
import { District } from "../models/District";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { escapeRegex, pick, qs, sanitizeImage, sanitizeGallery } from "../utils/sanitize";

const ATTRACTION_FIELDS = [
  "slug", "districtId", "name", "category", "tagline", "description", "history",
  "heroImage", "gallery", "coordinates", "openingHours", "entryFee",
  "bestTimeToVisit", "activities", "localFoods", "travelTips",
  "nearbyAttractions", "nearbyHotels", "nearbyRestaurants", "featured", "trending",
  "rating", "reviewCount"
];

// GET /api/attractions?district=&category=&featured=&trending=&q=
export const listAttractions = asyncHandler(async (req: Request, res: Response) => {
  const district  = qs(req.query.district);
  const category  = qs(req.query.category);
  const q         = qs(req.query.q)?.trim();
  const filter: Record<string, unknown> = {};

  if (district)              filter.districtId = district;
  if (category)              filter.category   = category;
  if (req.query.featured)    filter.featured   = true;
  if (req.query.trending)    filter.trending   = true;
  if (q)                     filter.name       = { $regex: escapeRegex(q), $options: "i" };

  const result = await Attraction.find(filter).sort({ rating: -1 }).limit(200);
  ok(res, result);
});

// GET /api/attractions/:slug -> { attraction, nearby }
export const getAttraction = asyncHandler(async (req: Request, res: Response) => {
  const attraction = await Attraction.findOne({ slug: req.params.slug });
  if (!attraction) return fail(res, "Attraction not found", 404);
  const nearby = await Attraction.find({ id: { $in: attraction.nearbyAttractions } });
  ok(res, { attraction, nearby });
});

// GET /api/districts/:slug/attractions?category=&q=
export const listDistrictAttractions = asyncHandler(async (req: Request, res: Response) => {
  const district = await District.findOne({ slug: req.params.slug });
  if (!district) return fail(res, "District not found", 404);

  const category = qs(req.query.category);
  const q        = qs(req.query.q)?.trim();
  const filter: Record<string, unknown> = { districtId: district.id };

  if (category) filter.category = category;
  if (q)        filter.name     = { $regex: escapeRegex(q), $options: "i" };

  const attractions = await Attraction.find(filter).sort({ rating: -1 }).limit(200);
  ok(res, attractions);
});

// --- Admin CRUD ---

export const createAttraction = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, ATTRACTION_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  if (body.gallery !== undefined) body.gallery = sanitizeGallery(body.gallery);
  const attraction = await Attraction.create({ ...body, id: (body.id as string) ?? genId("a") });
  ok(res, attraction, 201);
});

export const updateAttraction = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, ATTRACTION_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  if (body.gallery !== undefined) body.gallery = sanitizeGallery(body.gallery);
  const attraction = await Attraction.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!attraction) return fail(res, "Attraction not found", 404);
  ok(res, attraction);
});

export const deleteAttraction = asyncHandler(async (req: Request, res: Response) => {
  const attraction = await Attraction.findOneAndDelete({ id: req.params.id });
  if (!attraction) return fail(res, "Attraction not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
