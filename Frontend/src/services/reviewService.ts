import { apiGet, apiPost, apiPatch, apiDelete } from "./api-client";
import type { Review } from "@/types";

export const reviewService = {
  getByDestination: (destinationId: string) =>
    apiGet<Review[]>(`/reviews?destination=${destinationId}`),

  getApproved: () =>
    apiGet<Review[]>("/reviews?status=approved"),

  getByUser: (userId: string) =>
    apiGet<Review[]>(`/reviews?user=${userId}`, true),

  create: (payload: Partial<Review>) =>
    apiPost<Review>("/reviews", payload, true),

  voteHelpful: (id: string) =>
    apiPost<{ helpful: number }>(`/reviews/${id}/helpful`, {}, true),

  update: (id: string, payload: Partial<Pick<Review, "rating" | "title" | "body" | "photos">>) =>
    apiPatch<Review>(`/reviews/${id}`, payload),

  updateStatus: (id: string, status: Review["status"]) =>
    apiPatch(`/reviews/${id}/status`, { status }),

  remove: (id: string) =>
    apiDelete(`/reviews/${id}`),
};
