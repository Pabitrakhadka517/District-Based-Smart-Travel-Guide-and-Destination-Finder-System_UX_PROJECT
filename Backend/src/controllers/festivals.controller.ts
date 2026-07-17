import type { Request, Response } from "express";
import { Festival } from "../models/Festival";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { parsePagination } from "../utils/pagination";
import { makeAdminCrud } from "../utils/crudFactory";

const FESTIVAL_FIELDS = [
  "slug", "name", "month", "season", "type", "description", "image", "where",
  "districtId", "isNationwide", "duration", "coordinates"
];

// GET /api/festivals
export const listFestivals = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const [festivals, total] = await Promise.all([
    Festival.find().sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Festival.countDocuments()
  ]);
  okPaginated(res, festivals, total, page, limit);
});

// GET /api/festivals/:slug
export const getFestival = asyncHandler(async (req: Request, res: Response) => {
  const festival = await Festival.findOne({ slug: req.params.slug }).lean();
  if (!festival) return fail(res, "Festival not found", 404);
  ok(res, festival);
});

// --- Admin CRUD ---
// No onDeleted cascade needed: nothing else in the schema references a
// Festival by id.

const crud = makeAdminCrud(Festival, {
  fields: FESTIVAL_FIELDS,
  idPrefix: "f",
  notFoundMessage: "Festival not found",
  imageFields: ["image"]
});

export const createFestival = crud.create;
export const updateFestival = crud.update;
export const deleteFestival = crud.remove;
