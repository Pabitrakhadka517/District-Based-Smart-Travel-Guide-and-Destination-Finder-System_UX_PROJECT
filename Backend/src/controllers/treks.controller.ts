import type { Request, Response } from "express";
import { Trek } from "../models/Trek";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, qs, sanitizeImage, sanitizeGallery } from "../utils/sanitize";

const TREK_FIELDS = [
  "slug", "name", "region", "districtIds", "tagline", "description", "heroImage", "gallery",
  "difficulty", "durationDays", "maxAltitude", "distanceKm", "bestSeasons",
  "permits", "highlights", "itinerary", "coordinates", "rating", "priceFrom", "featured"
];

const VALID_DIFFICULTIES = ["Easy", "Moderate", "Challenging", "Strenuous"];

// GET /api/treks?featured=&difficulty=
export const listTreks = asyncHandler(async (req: Request, res: Response) => {
  const difficulty = qs(req.query.difficulty);
  const filter: Record<string, unknown> = {};

  if (req.query.featured) filter.featured = true;
  if (difficulty) {
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return fail(res, `difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}`, 400);
    }
    filter.difficulty = difficulty;
  }

  const result = await Trek.find(filter).sort({ rating: -1 });
  ok(res, result);
});

// GET /api/treks/:slug
export const getTrek = asyncHandler(async (req: Request, res: Response) => {
  const trek = await Trek.findOne({ slug: req.params.slug });
  if (!trek) return fail(res, "Trek not found", 404);
  ok(res, trek);
});

// --- Admin CRUD ---

export const createTrek = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, TREK_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  if (body.gallery !== undefined) body.gallery = sanitizeGallery(body.gallery);
  const trek = await Trek.create({ ...body, id: (body.id as string) ?? genId("tk") });
  ok(res, trek, 201);
});

export const updateTrek = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, TREK_FIELDS);
  if (body.heroImage !== undefined) body.heroImage = sanitizeImage(body.heroImage);
  if (body.gallery !== undefined) body.gallery = sanitizeGallery(body.gallery);
  if (body.slug) {
    const conflict = await Trek.findOne({ slug: body.slug, id: { $ne: req.params.id } });
    if (conflict) return fail(res, `Slug "${body.slug}" is already used by another trek.`, 409);
  }
  const trek = await Trek.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!trek) return fail(res, "Trek not found", 404);
  ok(res, trek);
});

export const deleteTrek = asyncHandler(async (req: Request, res: Response) => {
  const trek = await Trek.findOneAndDelete({ id: req.params.id });
  if (!trek) return fail(res, "Trek not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
