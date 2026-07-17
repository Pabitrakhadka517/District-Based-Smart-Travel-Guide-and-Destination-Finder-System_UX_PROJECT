import { apiGet, apiPost, apiDelete } from "./api-client";
import type { Destination, TouristAttraction } from "@/types";

export interface WishlistData {
  ids: string[];
  destinations: Destination[];
  attractions: TouristAttraction[];
}

export const wishlistService = {
  get: () =>
    apiGet<WishlistData>("/wishlist", true),

  // `id` may be a Destination or an Attraction id — the field name is kept as
  // `destinationId` for backward compatibility with the existing API contract.
  add: (id: string) =>
    apiPost("/wishlist", { destinationId: id }, true),

  remove: (id: string) =>
    apiDelete(`/wishlist/${id}`),
};
