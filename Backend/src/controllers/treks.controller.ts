import type { Request, Response } from "express";
import { Trek } from "../models/Trek";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { qs } from "../utils/sanitize";
import { parsePagination } from "../utils/pagination";
import { makeAdminCrud } from "../utils/crudFactory";
import { cascadeTrekReferences } from "../services/cascade.service";

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

  const { page, limit, skip } = parsePagination(req.query, 100);
  const [result, total] = await Promise.all([
    Trek.find(filter).sort({ rating: -1 }).skip(skip).limit(limit).lean(),
    Trek.countDocuments(filter)
  ]);
  okPaginated(res, result, total, page, limit);
});

// GET /api/treks/:slug
export const getTrek = asyncHandler(async (req: Request, res: Response) => {
  const trek = await Trek.findOne({ slug: req.params.slug }).lean();
  if (!trek) return fail(res, "Trek not found", 404);
  ok(res, trek);
});

// --- Admin CRUD ---

const crud = makeAdminCrud(Trek, {
  fields: TREK_FIELDS,
  idPrefix: "tk",
  notFoundMessage: "Trek not found",
  imageFields: ["heroImage"],
  galleryFields: ["gallery"],
  checkSlugConflict: true,
  // A trip plan's `trekIds` snapshot would otherwise dangle on a deleted trek.
  onDeleted: (doc) => cascadeTrekReferences(doc.id as string)
});

export const createTrek = crud.create;
export const updateTrek = crud.update;
export const deleteTrek = crud.remove;
