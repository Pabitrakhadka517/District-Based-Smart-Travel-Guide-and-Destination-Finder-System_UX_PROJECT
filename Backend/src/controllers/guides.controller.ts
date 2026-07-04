import type { Request, Response } from "express";
import { Guide } from "../models/Guide";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, qs, sanitizeImage } from "../utils/sanitize";

const GUIDE_FIELDS = [
  "slug", "title", "category", "excerpt", "body", "cover", "authorAvatar",
  "readMinutes", "author", "date", "tags", "featured", "coordinates", "districtId"
];

const VALID_CATEGORIES = ["culture", "trekking", "food", "nature", "adventure", "history", "travel-tips"];

// GET /api/guides?featured=&category= -> GuideArticle[]
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

  const guides = await Guide.find(filter).sort({ publishedAt: -1 });
  ok(res, guides);
});

// GET /api/guides/:slug -> GuideArticle
export const getGuide = asyncHandler(async (req: Request, res: Response) => {
  const guide = await Guide.findOne({ slug: req.params.slug });
  if (!guide) return fail(res, "Guide not found", 404);
  ok(res, guide);
});

// --- Admin CRUD ---

export const createGuide = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, GUIDE_FIELDS);
  if (body.cover !== undefined) body.cover = sanitizeImage(body.cover);
  if (body.authorAvatar !== undefined) body.authorAvatar = sanitizeImage(body.authorAvatar);
  const guide = await Guide.create({ ...body, id: (body.id as string) ?? genId("g") });
  ok(res, guide, 201);
});

export const updateGuide = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, GUIDE_FIELDS);
  if (body.cover !== undefined) body.cover = sanitizeImage(body.cover);
  if (body.authorAvatar !== undefined) body.authorAvatar = sanitizeImage(body.authorAvatar);
  const guide = await Guide.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!guide) return fail(res, "Guide not found", 404);
  ok(res, guide);
});

export const deleteGuide = asyncHandler(async (req: Request, res: Response) => {
  const guide = await Guide.findOneAndDelete({ id: req.params.id });
  if (!guide) return fail(res, "Guide not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
