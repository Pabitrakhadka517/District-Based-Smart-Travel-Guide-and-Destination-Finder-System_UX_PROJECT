import type { Request, Response } from "express";
import { Notification } from "../models/Notification";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { ADMIN_BROADCAST_USER_ID } from "../services/notification.service";

// GET /api/notifications  (auth) — latest 30 for the current user, plus an unread count for the bell badge.
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ userId, read: false })
  ]);
  ok(res, { items, unreadCount });
});

// PATCH /api/notifications/:id/read  (auth)
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOneAndUpdate(
    { id: req.params.id, userId: req.auth!.sub },
    { $set: { read: true } },
    { new: true }
  );
  if (!notification) return fail(res, "Notification not found", 404);
  ok(res, notification);
});

// PATCH /api/notifications/read-all  (auth)
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ userId: req.auth!.sub, read: false }, { $set: { read: true } });
  ok(res, null);
});

// GET /api/admin/notifications  (requireAdmin) — the shared admin queue
// (pending bookings/reviews), broadcast to every admin rather than tied to
// one admin's user id — see ADMIN_BROADCAST_USER_ID.
export const listAdminNotifications = asyncHandler(async (_req: Request, res: Response) => {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId: ADMIN_BROADCAST_USER_ID }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ userId: ADMIN_BROADCAST_USER_ID, read: false })
  ]);
  ok(res, { items, unreadCount });
});

// PATCH /api/admin/notifications/:id/read  (requireAdmin)
export const markAdminRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOneAndUpdate(
    { id: req.params.id, userId: ADMIN_BROADCAST_USER_ID },
    { $set: { read: true } },
    { new: true }
  );
  if (!notification) return fail(res, "Notification not found", 404);
  ok(res, notification);
});

// PATCH /api/admin/notifications/read-all  (requireAdmin)
export const markAllAdminRead = asyncHandler(async (_req: Request, res: Response) => {
  await Notification.updateMany({ userId: ADMIN_BROADCAST_USER_ID, read: false }, { $set: { read: true } });
  ok(res, null);
});
