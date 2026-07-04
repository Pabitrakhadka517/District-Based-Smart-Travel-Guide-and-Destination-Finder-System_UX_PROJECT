import type { Request, Response } from "express";
import { District } from "../models/District";
import { City } from "../models/City";
import { Destination } from "../models/Destination";
import { Attraction } from "../models/Attraction";
import { Trek } from "../models/Trek";
import { Festival } from "../models/Festival";
import { Guide } from "../models/Guide";
import { Review } from "../models/Review";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, sanitizeImage } from "../utils/sanitize";
import { getWeatherInsight } from "../services/weather";

const DISTRICT_FIELDS = [
  "slug", "name", "province", "description", "heroImage", "coordinates",
  "cityCount", "destinationCount", "popularFor", "rating", "bestSeason", "attractionCount"
];

// GET /api/districts
export const listDistricts = asyncHandler(async (_req: Request, res: Response) => {
  // Sort by province then name for consistent, meaningful ordering
  const districts = await District.find().sort({ province: 1, name: 1 });
  ok(res, districts);
});

// GET /api/districts/:slug -> full district tourism hub payload
export const getDistrict = asyncHandler(async (req: Request, res: Response) => {
  const district = await District.findOne({ slug: req.params.slug });
  if (!district) return fail(res, "District not found", 404);

  const [cities, destinations, attractions, treks, festivals, guides, provinceMates] = await Promise.all([
    City.find({ districtId: district.id }).sort({ name: 1 }),
    Destination.find({ districtId: district.id }).sort({ rating: -1 }),
    Attraction.find({ districtId: district.id }).sort({ rating: -1 }).limit(200),
    Trek.find({ districtIds: district.id }).sort({ rating: -1 }),
    Festival.find({ $or: [{ districtId: district.id }, { isNationwide: true }] }).sort({ name: 1 }),
    Guide.find({ districtId: district.id }).sort({ featured: -1 }),
    District.find({ province: district.province, id: { $ne: district.id } }).sort({ name: 1 }),
  ]);

  const destinationIds = destinations.map((d) => d.id);
  const [reviews, recommended] = await Promise.all([
    destinationIds.length
      ? Review.find({ destinationId: { $in: destinationIds }, status: "approved" }).sort({ date: -1 }).limit(30)
      : Promise.resolve([]),
    destinations.length === 0
      ? Destination.find({ districtId: { $in: provinceMates.slice(0, 6).map((d) => d.id) } })
          .sort({ rating: -1 })
          .limit(6)
      : Promise.resolve([]),
  ]);

  const weather = await getWeatherInsight(
    district.coordinates.lat,
    district.coordinates.lng,
    [district.bestSeason].filter(Boolean)
  );

  ok(res, {
    district,
    cities,
    destinations,
    attractions,
    treks,
    festivals,
    guides,
    reviews,
    weather,
    nearbyDistricts: provinceMates.slice(0, 4),
    recommended,
    counts: {
      cityCount: cities.length,
      destinationCount: destinations.length,
      attractionCount: attractions.length,
    },
  });
});

// --- Admin CRUD ---

export const createDistrict = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, DISTRICT_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  const district = await District.create({ ...body, id: (body.id as string) ?? genId("d") });
  ok(res, district, 201);
});

export const updateDistrict = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, DISTRICT_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  if (body.slug) {
    const conflict = await District.findOne({ slug: body.slug, id: { $ne: req.params.id } });
    if (conflict) return fail(res, `Slug "${body.slug}" is already used by another district.`, 409);
  }
  const district = await District.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!district) return fail(res, "District not found", 404);
  ok(res, district);
});

export const deleteDistrict = asyncHandler(async (req: Request, res: Response) => {
  const district = await District.findOneAndDelete({ id: req.params.id });
  if (!district) return fail(res, "District not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
