import type { Request, Response } from "express";
import { Attraction } from "../models/Attraction";
import { District } from "../models/District";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { escapeRegex, qs } from "../utils/sanitize";
import { parsePagination } from "../utils/pagination";
import { makeAdminCrud } from "../utils/crudFactory";
import { cascadeAttractionReferences } from "../services/cascade.service";
import { syncDistrictCounts } from "../services/counts.service";

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

  const { page, limit, skip } = parsePagination(req.query, 350);
  const [result, total] = await Promise.all([
    Attraction.find(filter).sort({ rating: -1 }).skip(skip).limit(limit).lean(),
    Attraction.countDocuments(filter)
  ]);
  okPaginated(res, result, total, page, limit);
});

// GET /api/attractions/:slug -> { attraction, nearby }
export const getAttraction = asyncHandler(async (req: Request, res: Response) => {
  const attraction = await Attraction.findOne({ slug: req.params.slug }).lean();
  if (!attraction) return fail(res, "Attraction not found", 404);
  const nearby = await Attraction.find({ id: { $in: attraction.nearbyAttractions } }).lean();
  ok(res, { attraction, nearby });
});

// GET /api/districts/:slug/attractions?category=&q=
export const listDistrictAttractions = asyncHandler(async (req: Request, res: Response) => {
  const district = await District.findOne({ slug: req.params.slug }).lean();
  if (!district) return fail(res, "District not found", 404);

  const category = qs(req.query.category);
  const q        = qs(req.query.q)?.trim();
  const filter: Record<string, unknown> = { districtId: district.id };

  if (category) filter.category = category;
  if (q)        filter.name     = { $regex: escapeRegex(q), $options: "i" };

  const { page, limit, skip } = parsePagination(req.query, 350);
  const [attractions, total] = await Promise.all([
    Attraction.find(filter).sort({ rating: -1 }).skip(skip).limit(limit).lean(),
    Attraction.countDocuments(filter)
  ]);
  okPaginated(res, attractions, total, page, limit);
});

// --- Admin CRUD ---

const crud = makeAdminCrud(Attraction, {
  fields: ATTRACTION_FIELDS,
  idPrefix: "a",
  notFoundMessage: "Attraction not found",
  imageFields: ["heroImage"],
  galleryFields: ["gallery"],
  onWritten: (doc) => syncDistrictCounts(doc.districtId as string),
  onDeleted: async (doc) => {
    await cascadeAttractionReferences(doc.id as string);
    await syncDistrictCounts(doc.districtId as string);
  }
});

export const createAttraction = crud.create;
export const updateAttraction = crud.update;
export const deleteAttraction = crud.remove;
