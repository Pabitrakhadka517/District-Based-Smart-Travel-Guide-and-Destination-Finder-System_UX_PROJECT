import { Notification } from "../models/Notification";
import { genId } from "../utils/ids";
import type { NotificationType } from "../models/types";

/**
 * Sentinel `userId` for notifications directed at admins rather than a
 * specific traveller — pending bookings/reviews are a shared operational
 * queue any admin can act on, not a message to one particular admin
 * account, so these are broadcast (one shared row, not fanned out per
 * admin user) rather than tied to a real user id.
 */
export const ADMIN_BROADCAST_USER_ID = "admin-broadcast";

/**
 * Creates an in-app notification. Callers fire this best-effort (`void
 * createNotification(...)`) right after the durable state change it
 * describes has already been saved — a failure here must never fail the
 * parent request, so errors are swallowed and logged here rather than
 * thrown, mirroring email.service.ts's "best effort" send.
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string;
}): Promise<void> {
  try {
    await Notification.create({
      id: genId("ntf"),
      userId: input.userId,
      type: input.type,
      message: input.message,
      link: input.link ?? ""
    });
  } catch (err) {
    console.error("[notification] Failed to create notification:", err);
  }
}
