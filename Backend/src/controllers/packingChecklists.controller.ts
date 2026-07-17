import type { Request, Response } from "express";
import { PackingChecklist } from "../models/PackingChecklist";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick } from "../utils/sanitize";

const CHECKLIST_FIELDS = ["category", "items"];

// GET /api/checklists
export const listPackingChecklists = asyncHandler(async (_req: Request, res: Response) => {
  const checklists = await PackingChecklist.find().sort({ category: 1 }).lean();
  ok(res, checklists);
});

// GET /api/checklists/:category
export const getPackingChecklist = asyncHandler(async (req: Request, res: Response) => {
  const checklist = await PackingChecklist.findOne({ category: req.params.category }).lean();
  if (!checklist) return fail(res, "Checklist not found", 404);
  ok(res, checklist);
});

// --- Admin CRUD ---

export const createPackingChecklist = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, CHECKLIST_FIELDS);
  const checklist = await PackingChecklist.create({ ...body, id: (body.id as string) ?? genId("chk") });
  ok(res, checklist, 201);
});

export const updatePackingChecklist = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, CHECKLIST_FIELDS);
  const checklist = await PackingChecklist.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!checklist) return fail(res, "Checklist not found", 404);
  ok(res, checklist);
});

export const deletePackingChecklist = asyncHandler(async (req: Request, res: Response) => {
  const checklist = await PackingChecklist.findOneAndDelete({ id: req.params.id });
  if (!checklist) return fail(res, "Checklist not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
