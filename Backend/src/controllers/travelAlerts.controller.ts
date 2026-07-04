import type { Request, Response } from "express";
import { TravelAlert } from "../models/TravelAlert";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { pick, qs } from "../utils/sanitize";

const ALERT_FIELDS = ["level", "text", "districtId", "isActive"];

// GET /api/travel-alerts?active=true
// Admins see every alert by default; everyone else only sees active ones.
export const listTravelAlerts = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.auth?.role === "admin";
  const activeParam = qs(req.query.active);

  const filter: Record<string, unknown> = {};
  if (!isAdmin) {
    filter.isActive = true;
  } else if (activeParam) {
    filter.isActive = activeParam === "true";
  }

  const alerts = await TravelAlert.find(filter).sort({ level: 1 });
  ok(res, alerts);
});

// --- Admin CRUD ---

export const createTravelAlert = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, ALERT_FIELDS);
  const alert = await TravelAlert.create({ ...body, id: (body.id as string) ?? genId("al") });
  ok(res, alert, 201);
});

export const updateTravelAlert = asyncHandler(async (req: Request, res: Response) => {
  const body = pick(req.body as Record<string, unknown>, ALERT_FIELDS);
  const alert = await TravelAlert.findOneAndUpdate(
    { id: req.params.id },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!alert) return fail(res, "Travel alert not found", 404);
  ok(res, alert);
});

export const deleteTravelAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await TravelAlert.findOneAndDelete({ id: req.params.id });
  if (!alert) return fail(res, "Travel alert not found", 404);
  ok(res, { id: req.params.id, deleted: true });
});
