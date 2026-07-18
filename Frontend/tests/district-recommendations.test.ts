import { describe, it, expect } from "vitest";
import { buildDistrictRecommendations } from "@/app/(user)/planner/district-recommendations";
import type { DistrictFull } from "@/services/content";
import type { Destination, TouristAttraction, Trek, Festival } from "@/types";

const image = { url: "https://example.com/x.jpg", publicId: null, alt: "" };
const coordinates = { lat: 28.2, lng: 83.9 };

function destination(overrides: Partial<Destination>): Destination {
  return {
    id: "d1", slug: "d1", cityId: "c1", districtId: "dist1", name: "Sample Destination",
    tagline: "", description: "", category: "Nature", tags: [], heroImage: image, gallery: [],
    coordinates, rating: 4, reviewCount: 10, bestTimeToVisit: [], budget: { budget: 1000, midRange: 2000, luxury: 5000, currency: "NPR" },
    attractions: [], activities: [], restaurants: [], localFoods: [], travelTips: [], pros: [], cons: [],
    nearby: [], featured: false, trending: false,
    ...overrides,
  };
}

function attraction(overrides: Partial<TouristAttraction>): TouristAttraction {
  return {
    id: "a1", slug: "a1", districtId: "dist1", name: "Sample Attraction", category: "Natural Attractions",
    tagline: "", description: "", history: "", heroImage: image, gallery: [], coordinates,
    rating: 4, reviewCount: 10, openingHours: "", entryFee: { nepali: 0, saarc: 0, foreigner: 0, currency: "NPR" },
    bestTimeToVisit: [], activities: [], localFoods: [], travelTips: [], nearbyAttractions: [],
    nearbyHotels: [], nearbyRestaurants: [], featured: false, trending: false,
    ...overrides,
  };
}

function trek(overrides: Partial<Trek>): Trek {
  return {
    id: "tk1", slug: "tk1", name: "Sample Trek", region: "Annapurna", tagline: "", description: "",
    heroImage: image, gallery: [], difficulty: "Moderate", durationDays: 5, maxAltitude: 4000,
    distanceKm: 50, bestSeasons: [], permits: [], highlights: [], itinerary: [], coordinates,
    rating: 4, priceFrom: 500, featured: false, districtIds: ["dist1"],
    ...overrides,
  };
}

function festival(overrides: Partial<Festival>): Festival {
  return {
    id: "f1", slug: "f1", name: "Sample Festival", month: "October", season: "Autumn", type: "Cultural",
    description: "", image, where: "Kathmandu", duration: "3 days", coordinates, districtId: "dist1",
    isNationwide: false,
    ...overrides,
  };
}

describe("buildDistrictRecommendations", () => {
  it("buckets a top-rated destination as Must Visit", () => {
    const district: DistrictFull = {
      destinations: [destination({ id: "d1", rating: 4.8 })],
      attractions: [], treks: [], festivals: [],
    } as unknown as DistrictFull;

    const buckets = buildDistrictRecommendations(district);
    const mustVisit = buckets.find((b) => b.key === "must-visit");
    expect(mustVisit?.items.map((i) => i.item.id)).toContain("d1");
  });

  it("buckets a highly-rated, low-review-count place as a Hidden Gem", () => {
    const district: DistrictFull = {
      destinations: [destination({ id: "d1", rating: 4.2, reviewCount: 5 })],
      attractions: [], treks: [], festivals: [],
    } as unknown as DistrictFull;

    const buckets = buildDistrictRecommendations(district);
    const hidden = buckets.find((b) => b.key === "hidden-gems");
    expect(hidden?.items.map((i) => i.item.id)).toContain("d1");
  });

  it("classifies religious content across destinations, attractions, and festivals", () => {
    const district: DistrictFull = {
      destinations: [destination({ id: "d1", category: "Religious", rating: 3 })],
      attractions: [attraction({ id: "a1", category: "Religious Sites", rating: 3 })],
      treks: [],
      festivals: [festival({ id: "f1", type: "Religious" })],
    } as unknown as DistrictFull;

    const buckets = buildDistrictRecommendations(district);
    const religious = buckets.find((b) => b.key === "religious");
    const ids = religious?.items.map((i) => `${i.kind}:${i.item.id}`);
    expect(ids).toEqual(expect.arrayContaining(["destination:d1", "attraction:a1", "festival:f1"]));
  });

  it("classifies a challenging trek as Adventure and a short one as a Weekend Trip", () => {
    const district: DistrictFull = {
      destinations: [], attractions: [],
      treks: [
        trek({ id: "tk-hard", difficulty: "Strenuous", durationDays: 10 }),
        trek({ id: "tk-short", difficulty: "Easy", durationDays: 2 }),
      ],
      festivals: [],
    } as unknown as DistrictFull;

    const buckets = buildDistrictRecommendations(district);
    const adventure = buckets.find((b) => b.key === "adventure");
    const weekend = buckets.find((b) => b.key === "weekend");
    expect(adventure?.items.map((i) => i.item.id)).toContain("tk-hard");
    expect(weekend?.items.map((i) => i.item.id)).toContain("tk-short");
  });

  it("returns no buckets for a district with nothing worth recommending", () => {
    const district: DistrictFull = {
      destinations: [], attractions: [], treks: [], festivals: [],
    } as unknown as DistrictFull;

    expect(buildDistrictRecommendations(district)).toEqual([]);
  });
});
