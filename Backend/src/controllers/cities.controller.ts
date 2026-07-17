import type { Request, Response } from "express";
import { City } from "../models/City";
import { District } from "../models/District";
import { Destination } from "../models/Destination";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { qs } from "../utils/sanitize";
import { parsePagination } from "../utils/pagination";
import { makeAdminCrud } from "../utils/crudFactory";
import { cascadeCityReferences } from "../services/cascade.service";
import { syncDistrictCounts } from "../services/counts.service";

const CITY_FIELDS = [
  "slug", "districtId", "name", "description", "image", "coordinates",
  "categories", "rating", "destinationCount", "altitude"
];

// GET /api/cities?district=<slug>&city=<slug>
export const listCities = asyncHandler(async (req: Request, res: Response) => {
  const districtSlug = qs(req.query.district);
  const citySlug     = qs(req.query.city);

  if (citySlug) {
    const found = await City.findOne({ slug: citySlug }).lean();
    if (!found) return fail(res, "City not found", 404);
    const [cityDestinations, parent] = await Promise.all([
      Destination.find({ cityId: found.id }).sort({ rating: -1 }).limit(50).lean(),
      District.findOne({ id: found.districtId }).lean()
    ]);
    return ok(res, { city: found, district: parent ?? null, destinations: cityDestinations });
  }

  if (districtSlug) {
    const d = await District.findOne({ slug: districtSlug }).lean();
    const result = d ? await City.find({ districtId: d.id }).sort({ name: 1 }).lean() : [];
    return ok(res, result);
  }

  const { page, limit, skip } = parsePagination(req.query, 300);
  const [result, total] = await Promise.all([
    City.find().sort({ name: 1 }).skip(skip).limit(limit).lean(),
    City.countDocuments()
  ]);
  okPaginated(res, result, total, page, limit);
});

// --- Admin CRUD ---

const crud = makeAdminCrud(City, {
  fields: CITY_FIELDS,
  idPrefix: "c",
  notFoundMessage: "City not found",
  imageFields: ["image"],
  checkSlugConflict: true,
  onWritten: (doc) => syncDistrictCounts(doc.districtId as string),
  onDeleted: async (doc) => {
    await cascadeCityReferences(doc.id as string);
    await syncDistrictCounts(doc.districtId as string);
  }
});

export const createCity = crud.create;
export const updateCity = crud.update;
export const deleteCity = crud.remove;
