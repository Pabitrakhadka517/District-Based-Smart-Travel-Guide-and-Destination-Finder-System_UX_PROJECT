import type { Request, Response } from "express";
import { District } from "../models/District";
import { City } from "../models/City";
import { Destination } from "../models/Destination";
import { Attraction } from "../models/Attraction";
import { Trek } from "../models/Trek";
import { Festival } from "../models/Festival";
import { Guide } from "../models/Guide";
import { Review } from "../models/Review";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { parsePagination } from "../utils/pagination";
import { getWeatherInsight } from "../services/weather";
import { makeAdminCrud } from "../utils/crudFactory";
import { cascadeDistrictReferences } from "../services/cascade.service";

const DISTRICT_FIELDS = [
  "slug", "name", "province", "description", "heroImage", "coordinates",
  "cityCount", "destinationCount", "popularFor", "rating", "bestSeason", "attractionCount"
];

// GET /api/districts
export const listDistricts = asyncHandler(async (req: Request, res: Response) => {
  // Sort by province then name for consistent, meaningful ordering
  const { page, limit, skip } = parsePagination(req.query, 100);
  const [districts, total] = await Promise.all([
    District.find().sort({ province: 1, name: 1 }).skip(skip).limit(limit).lean(),
    District.countDocuments()
  ]);
  okPaginated(res, districts, total, page, limit);
});

// GET /api/districts/:slug -> full district tourism hub payload
export const getDistrict = asyncHandler(async (req: Request, res: Response) => {
  const district = await District.findOne({ slug: req.params.slug }).lean();
  if (!district) return fail(res, "District not found", 404);

  const [cities, destinations, attractions, treks, festivals, guides, provinceMates] = await Promise.all([
    City.find({ districtId: district.id }).sort({ name: 1 }).lean(),
    Destination.find({ districtId: district.id }).sort({ rating: -1 }).lean(),
    Attraction.find({ districtId: district.id }).sort({ rating: -1 }).limit(200).lean(),
    Trek.find({ districtIds: district.id }).sort({ rating: -1 }).lean(),
    Festival.find({ $or: [{ districtId: district.id }, { isNationwide: true }] }).sort({ name: 1 }).lean(),
    Guide.find({ districtId: district.id }).sort({ featured: -1 }).lean(),
    District.find({ province: district.province, id: { $ne: district.id } }).sort({ name: 1 }).lean(),
  ]);

  const destinationIds = destinations.map((d) => d.id);
  const [reviews, recommended] = await Promise.all([
    destinationIds.length
      ? Review.find({ destinationId: { $in: destinationIds }, status: "approved" }).sort({ date: -1 }).limit(30).lean()
      : Promise.resolve([]),
    destinations.length === 0
      ? Destination.find({ districtId: { $in: provinceMates.slice(0, 6).map((d) => d.id) } })
          .sort({ rating: -1 })
          .limit(6)
          .lean()
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

const crud = makeAdminCrud(District, {
  fields: DISTRICT_FIELDS,
  idPrefix: "d",
  notFoundMessage: "District not found",
  imageFields: ["heroImage"],
  checkSlugConflict: true,
  // No model here uses ObjectId refs, so cities/destinations/attractions/
  // festivals/guides/reviews/bookings/wishlist/trip-plan entries scoped to
  // this district would otherwise be silently orphaned.
  onDeleted: (doc) => cascadeDistrictReferences(doc.id as string)
});

export const createDistrict = crud.create;
export const updateDistrict = crud.update;
export const deleteDistrict = crud.remove;
