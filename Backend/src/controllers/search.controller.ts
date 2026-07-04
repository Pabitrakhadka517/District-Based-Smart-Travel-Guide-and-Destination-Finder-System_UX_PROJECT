import type { Request, Response } from "express";
import { Destination } from "../models/Destination";
import { District } from "../models/District";
import { Attraction } from "../models/Attraction";
import { Trek } from "../models/Trek";
import { Festival } from "../models/Festival";
import { Guide } from "../models/Guide";
import { ok } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { escapeRegex, qs } from "../utils/sanitize";

// GET /api/search?q=&categories=Adventure,Nature&district=<id>&difficulty=&season=&minRating=&maxBudget=&sort=
export const search = asyncHandler(async (req: Request, res: Response) => {
  const q = qs(req.query.q)?.trim() ?? "";

  // Multi-category: "Adventure,Nature" — also accepts legacy single "category" param
  const categoriesRaw = qs(req.query.categories) ?? qs(req.query.category) ?? "";
  const categories = categoriesRaw
    ? categoriesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const districtId   = qs(req.query.district);
  const difficulty   = qs(req.query.difficulty);
  const season       = qs(req.query.season);
  const sort         = qs(req.query.sort) ?? "rating";
  const minRating    = parseFloat(String(req.query.minRating ?? "0"));
  const maxBudgetRaw = parseFloat(String(req.query.maxBudget ?? ""));

  const hasText  = q.length > 0;
  const escapedQ = hasText ? escapeRegex(q) : "";

  /* ── Sort map ─────────────────────────────────────────────────── */
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    rating:       { rating: -1 },
    reviews:      { reviewCount: -1 },
    "price-low":  { "budget.budget": 1 },
    "price-high": { "budget.budget": -1 },
    alphabetical: { name: 1 },
    newest:       { _id: -1 },
  };
  const mongoSort = sortMap[sort] ?? { rating: -1 as const };

  /* ── Category filter helper ──────────────────────────────────── */
  function categoryClause(): Record<string, unknown> {
    if (categories.length === 0) return {};
    if (categories.length === 1) return { category: categories[0] };
    return { category: { $in: categories } };
  }

  /* ── Destination filter ──────────────────────────────────────── */
  const destFilter: Record<string, unknown> = { ...categoryClause() };
  if (hasText) {
    const r = { $regex: escapedQ, $options: "i" };
    destFilter.$or = [{ name: r }, { tagline: r }, { description: r }, { tags: r }];
  }
  if (districtId) destFilter.districtId = districtId;
  if (difficulty)  destFilter.difficulty  = difficulty;
  if (season)      destFilter.bestTimeToVisit = season; // MongoDB matches array elements
  if (!isNaN(minRating) && minRating > 0) destFilter.rating = { $gte: minRating };
  if (!isNaN(maxBudgetRaw) && maxBudgetRaw > 0) destFilter["budget.budget"] = { $lte: maxBudgetRaw };

  /* ── Attraction filter ───────────────────────────────────────── */
  const attrFilter: Record<string, unknown> = { ...categoryClause() };
  if (hasText) {
    const r = { $regex: escapedQ, $options: "i" };
    attrFilter.$or = [{ name: r }, { tagline: r }, { description: r }];
  }
  if (districtId) attrFilter.districtId = districtId;
  if (!isNaN(minRating) && minRating > 0) attrFilter.rating = { $gte: minRating };
  const shouldSearchAttractions =
    hasText || !!districtId || categories.length > 0 || minRating > 0 || !!season;

  /* ── Trek filter ─────────────────────────────────────────────── */
  const shouldSearchTreks =
    hasText || categories.includes("Trekking") || !!difficulty || !!season;
  const trekFilter: Record<string, unknown> = {};
  if (hasText) {
    trekFilter.$or = [
      { name: { $regex: escapedQ, $options: "i" } },
      { tagline: { $regex: escapedQ, $options: "i" } },
      { description: { $regex: escapedQ, $options: "i" } },
    ];
  }
  if (difficulty) trekFilter.difficulty  = difficulty;
  if (season)     trekFilter.bestSeasons = season;

  /* ── Run all queries in parallel ─────────────────────────────── */
  const [destinations, districts, attractions, treks, festivals, guides] = await Promise.all([
    Destination.find(destFilter).sort(mongoSort).limit(100),

    hasText
      ? District.find({ name: { $regex: escapedQ, $options: "i" } }).limit(20)
      : Promise.resolve([]),

    shouldSearchAttractions
      ? Attraction.find(attrFilter).sort({ rating: -1 }).limit(20)
      : Promise.resolve([]),

    shouldSearchTreks
      ? Trek.find(trekFilter).sort({ rating: -1 }).limit(10)
      : Promise.resolve([]),

    hasText
      ? Festival.find({ name: { $regex: escapedQ, $options: "i" } }).limit(10)
      : Promise.resolve([]),

    hasText
      ? Guide.find({ title: { $regex: escapedQ, $options: "i" } }).limit(10)
      : Promise.resolve([]),
  ]);

  ok(res, {
    destinations,
    districts,
    attractions,
    treks,
    festivals,
    guides,
    total:
      destinations.length +
      attractions.length +
      treks.length +
      festivals.length +
      guides.length,
  });
});

// GET /api/search/popular — top names to show as "trending" search suggestions,
// derived from real content instead of a hardcoded list.
export const getPopularSearches = asyncHandler(async (_req: Request, res: Response) => {
  const [destinations, treks, districts] = await Promise.all([
    Destination.find().sort({ trending: -1, reviewCount: -1, rating: -1 }).limit(16).select("name"),
    Trek.find().sort({ rating: -1 }).limit(8).select("name"),
    District.find().sort({ rating: -1, destinationCount: -1 }).limit(6).select("name"),
  ]);

  const names = [
    ...destinations.map((d) => d.name),
    ...treks.map((t) => t.name),
    ...districts.map((d) => d.name),
  ];

  // A trek and its destination entry (or a district and a same-named place) can share
  // a name — dedupe so callers never render the same suggestion twice.
  ok(res, Array.from(new Set(names)));
});
