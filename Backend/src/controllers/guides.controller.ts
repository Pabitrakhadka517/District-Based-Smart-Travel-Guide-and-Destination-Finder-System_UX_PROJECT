import type { Request, Response } from "express";
import { Guide } from "../models/Guide";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { qs } from "../utils/sanitize";
import { parsePagination } from "../utils/pagination";
import { makeAdminCrud } from "../utils/crudFactory";

const GUIDE_FIELDS = [
  "slug", "title", "category", "excerpt", "body", "cover", "authorAvatar",
  "readMinutes", "author", "date", "tags", "featured", "coordinates", "districtId"
];

const VALID_CATEGORIES = ["Tips", "Itineraries", "Culture", "Food", "Trekking"];

// GET /api/guides?featured=&category=&page=&limit= -> GuideArticle[]
export const listGuides = asyncHandler(async (req: Request, res: Response) => {
  const featured  = req.query.featured;
  const category  = qs(req.query.category);
  const filter: Record<string, unknown> = {};

  if (featured) filter.featured = true;
  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      return fail(res, `category must be one of: ${VALID_CATEGORIES.join(", ")}`, 400);
    }
    filter.category = category;
  }

  const { page, limit, skip } = parsePagination(req.query, 100);
  const [guides, total] = await Promise.all([
    Guide.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Guide.countDocuments(filter)
  ]);
  okPaginated(res, guides, total, page, limit);
});

// GET /api/guides/:slug -> GuideArticle
export const getGuide = asyncHandler(async (req: Request, res: Response) => {
  const guide = await Guide.findOne({ slug: req.params.slug }).lean();
  if (!guide) return fail(res, "Guide not found", 404);
  ok(res, guide);
});

// --- Admin CRUD ---
// No onDeleted cascade needed: nothing else in the schema references a Guide
// by id.

const crud = makeAdminCrud(Guide, {
  fields: GUIDE_FIELDS,
  idPrefix: "g",
  notFoundMessage: "Guide not found",
  imageFields: ["cover", "authorAvatar"]
});

export const createGuide = crud.create;
export const updateGuide = crud.update;
export const deleteGuide = crud.remove;
