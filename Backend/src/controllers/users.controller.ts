import type { Request, Response } from "express";
import { User } from "../models/User";
import { ok, fail, okPaginated } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { parsePagination } from "../utils/pagination";
import { cascadeUserReferences } from "../services/cascade.service";
import { deleteImage, PLACEHOLDER } from "../services/cloudinary.service";

const VALID_ROLES = ["user", "admin"] as const;

// GET /api/users (admin)
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 500);
  const [users, total] = await Promise.all([
    User.find().sort({ joinedAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments()
  ]);
  okPaginated(res, users, total, page, limit);
});

// GET /api/users/:id (admin)
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ id: req.params.id }).lean();
  if (!user) return fail(res, "User not found", 404);
  ok(res, user);
});

// PATCH /api/users/:id/role { role } (admin)
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body ?? {};
  if (!VALID_ROLES.includes(role)) return fail(res, "role must be 'user' or 'admin'", 400);

  // Prevent an admin from accidentally demoting their own account
  if (req.params.id === req.auth!.sub) {
    return fail(res, "You cannot change your own role", 400);
  }

  const user = await User.findOneAndUpdate({ id: req.params.id }, { role }, { new: true });
  if (!user) return fail(res, "User not found", 404);
  ok(res, user);
});

// PATCH /api/users/:id/status { isActive } (admin)
// A reversible alternative to hard-deleting an account: a deactivated user
// can't log in (see auth.controller.ts login) but their data (trips, reviews,
// bookings) is preserved, unlike DELETE /api/users/:id.
export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body ?? {};
  if (typeof isActive !== "boolean") return fail(res, "isActive must be a boolean", 400);

  // Prevent an admin from accidentally locking themselves out
  if (req.params.id === req.auth!.sub) {
    return fail(res, "You cannot deactivate your own account", 400);
  }

  const user = await User.findOneAndUpdate({ id: req.params.id }, { isActive }, { new: true });
  if (!user) return fail(res, "User not found", 404);
  ok(res, user);
});

// DELETE /api/users/:id (admin)
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  // Prevent an admin from deleting their own account via this endpoint
  if (req.params.id === req.auth!.sub) {
    return fail(res, "You cannot delete your own account", 400);
  }

  const user = await User.findOneAndDelete({ id: req.params.id });
  if (!user) return fail(res, "User not found", 404);

  await cascadeUserReferences(user.id);

  // Never delete the shared default-avatar placeholder — only a genuinely
  // custom upload belongs to this user alone.
  if (user.avatar?.publicId && user.avatar.publicId !== PLACEHOLDER.avatar.publicId) {
    void deleteImage(user.avatar.publicId);
  }

  ok(res, { id: req.params.id, deleted: true });
});
