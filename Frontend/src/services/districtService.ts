import { apiGet } from "./api-client";
import type { District, TouristAttraction } from "@/types";
import type { DistrictFull } from "./content";

export const districtService = {
  getAll: () =>
    apiGet<District[]>("/districts"),

  getAttractions: (slug: string, category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return apiGet<TouristAttraction[]>(`/districts/${slug}/attractions${q}`);
  },

  // Full district tourism-hub payload (destinations/attractions/treks/
  // festivals/guides/weather/etc, see getDistrict in districts.controller.ts) —
  // fetched client-side for the interactive Trip Planner discovery flow,
  // unlike getDistrictFull in content.ts which is server-component-only.
  getFull: (slug: string) =>
    apiGet<DistrictFull>(`/districts/${slug}`),
};
