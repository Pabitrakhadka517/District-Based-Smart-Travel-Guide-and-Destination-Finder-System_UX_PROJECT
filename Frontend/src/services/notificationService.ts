import { apiGet, apiPatch } from "./api-client";
import type { Notification } from "@/types";

export interface NotificationFeed {
  items: Notification[];
  unreadCount: number;
}

export const notificationService = {
  getAll: () =>
    apiGet<NotificationFeed>("/notifications", true),

  markRead: (id: string) =>
    apiPatch<Notification>(`/notifications/${id}/read`, {}),

  markAllRead: () =>
    apiPatch<null>("/notifications/read-all", {}),
};
