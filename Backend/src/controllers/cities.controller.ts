import type { Request, Response } from "express";
import { City } from "../models/City";
import { District } from "../models/District";
import { Destination } from "../models/Destination";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, qs, sanitizeImage } from "../utils/sanitize";

const CITY_FIELDS = [
  "slug", "districtId", "name", "description", "image", "coordinates",
  "categories", "rating", "destinationCount", "altitude"
];

// GET /api/cities?district=<slug>&city=<slug>
export const listCities = asyncHandler(async (req: Request, res: Response) => {
  const districtSlug = qs(req.query.district);
  const citySlug     = qs(req.query.city);

  if (citySlug) {
    const found = await City.findOne({ slug: citySlug });
    if (!found) return fail(res, "City not found", 404);
    const [cityDestinations, parent] = await Promise.all([
      Destination.find({ cityId: found.id }).sort({ rating: -1 }).limit(50),
      District.findOne({ id: found.districtId })
    ]);
    return ok(res, { city: found, district: parent ?? null, destinations: cityDestinations });
  }

  if (districtSlug) {
    const d = await District.findOne({ slug: districtSlug });
    const result = d ? await City.find({ districtId: d.id }).sort({ name: 1 }) : [];
    return ok(res, result);
  }

  const result = await City.find().sort({ name: 1 }).limit(300);
  ok(res, result);
});

// --- Admin CRUD ---

export const createCity = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, CITY_FIELDS);
  if (body.image !== undefined) body.image = sanitizeImage(body.image);
  const city = await City.create({ ...body, id: (body.id as string) ?? genId("c") });
  ok(res, city, 201);
});

export const updateCity = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, CITY_FIELDS);
  if (body.image !== undefined) body.image = sanitizeImage(body.image);
  const city = await City.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!city) return fail(res, "City not found", 404);
  ok(res, city);
});

export const deleteCity = asyncHandler(async (req: Request, res: Response) => {
  const city = await City.findOneAndDelete({ id: req.params.id });
  if (!city) return fail(res, "City not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
