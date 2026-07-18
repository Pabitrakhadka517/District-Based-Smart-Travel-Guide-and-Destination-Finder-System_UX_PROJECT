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
import { parsePagination } from "../utils/pagination";

// GET /api/search?q=&categories=Adventure,Nature&district=<id>&difficulty=&season=&minRating=&maxBudget=&sort=&page=&limit=
export const search = asyncHandler(async (req: Request, res: Response) => {
  const q = qs(req.query.q)?.trim() ?? "";
  const { page, limit, skip } = parsePagination(req.query, 24);

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
  if (season)      attrFilter.bestTimeToVisit = season; // MongoDB matches array elements
  if (!isNaN(minRating) && minRating > 0) attrFilter.rating = { $gte: minRating };
  const shouldSearchAttractions =
    hasText || !!districtId || categories.length > 0 || minRating > 0 || !!season;

  /* ── Trek filter ─────────────────────────────────────────────── */
  // Treks have no `category` field of their own (they're inherently "Trekking"),
  // so selecting the "Trekking" category is treated as "include treks" rather
  // than an actual field filter.
  const shouldSearchTreks =
    hasText || categories.includes("Trekking") || !!difficulty || !!season || !!districtId || minRating > 0;
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
  // districtIds is an array field — this matches any trek that passes through it.
  if (districtId) trekFilter.districtIds = districtId;
  if (!isNaN(minRating) && minRating > 0) trekFilter.rating = { $gte: minRating };

  /* ── Festival filter ─────────────────────────────────────────── */
  // Composed as $and-of-conditions rather than reusing a single top-level $or,
  // since text-match and district-match are each their own OR clause that
  // must both hold — merging them into one flat $or would wrongly turn
  // "text matches AND in this district" into "text matches OR in this district".
  const shouldSearchFestivals = hasText || !!districtId || categories.length > 0;
  const festivalConditions: Record<string, unknown>[] = [];
  if (hasText) {
    festivalConditions.push({
      $or: [
        { name: { $regex: escapedQ, $options: "i" } },
        { description: { $regex: escapedQ, $options: "i" } },
      ],
    });
  }
  // Nationwide festivals (Dashain, Tihar, ...) are relevant regardless of the
  // district filter, matching how a district hub page includes them (see
  // districts.controller.ts's `$or` on districtId/isNationwide).
  if (districtId) festivalConditions.push({ $or: [{ districtId }, { isNationwide: true }] });
  // `categories` is the Destination/Attraction taxonomy; Festival.type only
  // overlaps on "Religious"/"Cultural" — $in against non-overlapping values
  // (e.g. "Lake") simply matches nothing, which is correct, not a bug.
  if (categories.length > 0) festivalConditions.push({ type: { $in: categories } });
  const festivalFilter: Record<string, unknown> = festivalConditions.length > 0 ? { $and: festivalConditions } : {};

  /* ── Guide filter ────────────────────────────────────────────── */
  const shouldSearchGuides = hasText || !!districtId || categories.length > 0;
  const guideFilter: Record<string, unknown> = {};
  if (hasText) {
    guideFilter.$or = [
      { title: { $regex: escapedQ, $options: "i" } },
      { excerpt: { $regex: escapedQ, $options: "i" } },
      { tags: { $regex: escapedQ, $options: "i" } },
    ];
  }
  if (districtId) guideFilter.districtId = districtId;
  // Guide.category only overlaps the Destination taxonomy on "Trekking" — same
  // reasoning as Festival.type above.
  if (categories.length > 0) guideFilter.category = { $in: categories };

  /* ── Run all queries in parallel ─────────────────────────────── */
  // Destinations are the primary, most prominent result section, so they get
  // real page/limit pagination; the other categories are secondary "preview"
  // sections whose caps are just bumped comfortably above current collection
  // sizes so a broad query can never silently drop matches.
  const [destinations, destinationsTotal, districts, attractions, treks, festivals, guides] = await Promise.all([
    Destination.find(destFilter).sort(mongoSort).skip(skip).limit(limit).lean(),
    Destination.countDocuments(destFilter),

    hasText
      ? District.find({
          $or: [
            { name: { $regex: escapedQ, $options: "i" } },
            { province: { $regex: escapedQ, $options: "i" } },
          ],
        }).limit(80).lean()
      : Promise.resolve([]),

    shouldSearchAttractions
      ? Attraction.find(attrFilter).sort({ rating: -1 }).limit(350).lean()
      : Promise.resolve([]),

    shouldSearchTreks
      ? Trek.find(trekFilter).sort({ rating: -1 }).limit(50).lean()
      : Promise.resolve([]),

    shouldSearchFestivals
      ? Festival.find(festivalFilter).limit(50).lean()
      : Promise.resolve([]),

    shouldSearchGuides
      ? Guide.find(guideFilter).limit(50).lean()
      : Promise.resolve([]),
  ]);

  ok(res, {
    destinations,
    destinationsTotal,
    destinationsPage: page,
    destinationsLimit: limit,
    districts,
    attractions,
    treks,
    festivals,
    guides,
    total:
      destinationsTotal +
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
    Destination.find().sort({ trending: -1, reviewCount: -1, rating: -1 }).limit(16).select("name").lean(),
    Trek.find().sort({ rating: -1 }).limit(8).select("name").lean(),
    District.find().sort({ rating: -1, destinationCount: -1 }).limit(6).select("name").lean(),
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
