import { describe, it, expect } from "vitest";
import { buildSuggestedItinerary } from "@/app/(user)/planner/itinerary-suggestions";
import type { Destination, TouristAttraction, Trek, TripPlan } from "@/types";

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

function plan(overrides: Partial<TripPlan>): TripPlan {
  return {
    id: "t1", title: "Test Trip", travelType: "Adventure", travelers: 2, districtId: "dist1",
    destinationIds: [], attractionIds: [], trekIds: [], startDate: "", endDate: "",
    budget: 0, budgetBreakdown: { accommodation: 0, food: 0, transportation: 0, activities: 0, other: 0 },
    accommodationPreference: "Standard", transportPreference: "Local Bus", bookingId: "", status: "draft",
    notes: "", itinerary: [], checklist: [], photos: [],
    ...overrides,
  };
}

function activityTitles(days: ReturnType<typeof buildSuggestedItinerary>): string[][] {
  return days.map((d) => d.activities.map((a) => a.title));
}

describe("buildSuggestedItinerary", () => {
  it("never repeats the same standalone attraction on more than one day", () => {
    const dest = destination({ id: "d1" });
    const onlyOneAttraction = attraction({ id: "a1", name: "The One Attraction" });

    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["d1"], startDate: "2099-06-01", endDate: "2099-06-04" }), // 4-day trip
      [dest],
      { attractions: [onlyOneAttraction], treks: [] }
    );

    expect(days).toHaveLength(4);
    const daysContainingIt = days.filter((d) => d.activities.some((a) => a.title === "The One Attraction"));
    expect(daysContainingIt).toHaveLength(1);
  });

  it("never repeats the same trek on more than one day", () => {
    const dest = destination({ id: "d1" });
    const onlyOneTrek = trek({ id: "tk1", name: "The One Trek" });

    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["d1"], startDate: "2099-06-01", endDate: "2099-06-05" }), // 5-day trip
      [dest],
      { attractions: [], treks: [onlyOneTrek] }
    );

    const daysContainingIt = days.filter((d) => d.activities.some((a) => a.title === "The One Trek"));
    expect(daysContainingIt).toHaveLength(1);
  });

  it("doesn't repeat a destination's own curated highlights once exhausted across a multi-day stay", () => {
    // Only 4 unique highlights but a 3-day stay wants up to 6 (2/day) —
    // day 3 should get fewer highlights, never a repeat of day 1's.
    const dest = destination({
      id: "d1",
      attractions: [
        { name: "Highlight A", description: "" },
        { name: "Highlight B", description: "" },
        { name: "Highlight C", description: "" },
        { name: "Highlight D", description: "" },
      ],
    });

    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["d1"], startDate: "2099-06-01", endDate: "2099-06-03" }), // 3-day trip, all at d1
      [dest],
      { attractions: [], treks: [] }
    );

    expect(days).toHaveLength(3);
    const allHighlightTitles = activityTitles(days)
      .flat()
      .filter((t) => t.startsWith("Highlight "));

    // Every highlight that does appear, appears exactly once — no duplicates anywhere.
    const counts = new Map<string, number>();
    for (const t of allHighlightTitles) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const [title, count] of counts) {
      expect(count, `"${title}" should appear at most once across the whole stay`).toBe(1);
    }
  });

  it("treats a curated attraction and an activity tag that differ only by case as the same highlight", () => {
    // Real-world case: Chitwan National Park's seed data has "Jeep Safari" as
    // a curated attraction (with a description) and "Jeep safari" as a plain
    // activity tag — the same real activity, phrased with different casing.
    // An exact-string dedup let both through as if they were distinct
    // suggestions, so the "same" activity appeared to repeat on a later day.
    const dest = destination({
      id: "d1",
      attractions: [{ name: "Jeep Safari", description: "Search for rhino and tiger." }],
      activities: ["Jeep safari", "Bird watching", "Jungle walk", "Canoeing"],
    });

    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["d1"], startDate: "2099-06-01", endDate: "2099-06-03" }), // 3-day stay, all at d1
      [dest],
      { attractions: [], treks: [] }
    );

    const allTitles = activityTitles(days).flat().map((t) => t.toLowerCase());
    const jeepSafariMentions = allTitles.filter((t) => t === "jeep safari");
    expect(jeepSafariMentions).toHaveLength(1);
  });

  it("varies the 'still at this destination' activity title across a multi-day stay instead of repeating it verbatim", () => {
    const dest = destination({ id: "d1", name: "Sample Destination" });

    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["d1"], startDate: "2099-06-01", endDate: "2099-06-04" }), // 4 days, all at d1
      [dest],
      { attractions: [], treks: [] }
    );

    // First activity of each day is the arrival/continuing-day title.
    const dayOneTitles = days.map((d) => d.activities[0].title);
    expect(dayOneTitles[0]).toBe("Arrive & settle in — Sample Destination");
    // Days 2-4 should each get a distinct phrasing, not the same string 3 times.
    const continuingTitles = dayOneTitles.slice(1);
    expect(new Set(continuingTitles).size).toBe(continuingTitles.length);
  });

  it("spreads multiple standalone extras across distinct days rather than clustering or repeating", () => {
    const dest = destination({ id: "d1" });
    const extras = [
      attraction({ id: "a1", name: "Extra One" }),
      attraction({ id: "a2", name: "Extra Two" }),
      attraction({ id: "a3", name: "Extra Three" }),
    ];

    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["d1"], startDate: "2099-06-01", endDate: "2099-06-03" }), // 3-day trip
      [dest],
      { attractions: extras, treks: [] }
    );

    for (const extra of extras) {
      const daysContainingIt = days.filter((d) => d.activities.some((a) => a.title === extra.name));
      expect(daysContainingIt).toHaveLength(1);
    }
  });

  it("attaches each standalone extra to the trip destination it's actually near, not just the next open day slot", () => {
    // Two destinations far apart within the district. Each extra sits right
    // next to one of them — it should only ever land on a day that
    // destination actually owns, never the other one's.
    const destA = destination({ id: "dA", name: "Destination A", coordinates: { lat: 28.60, lng: 81.61 } });
    const destB = destination({ id: "dB", name: "Destination B", coordinates: { lat: 28.10, lng: 82.10 } });
    const nearA = attraction({ id: "a1", name: "Near A Attraction", coordinates: { lat: 28.61, lng: 81.62 } });
    const nearB = trek({ id: "tk1", name: "Near B Trek", coordinates: { lat: 28.11, lng: 82.11 } });

    // 4-day trip, 2 destinations rotating daily: day0=A, day1=B, day2=A, day3=B.
    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["dA", "dB"], startDate: "2099-06-01", endDate: "2099-06-04" }),
      [destA, destB],
      { attractions: [nearA], treks: [nearB] }
    );

    expect(days).toHaveLength(4);
    const dayIndexOf = (title: string) => days.findIndex((d) => d.activities.some((a) => a.title === title));
    const dayOwnerOf = (title: string) => days[dayIndexOf(title)].title;

    // Near-A attraction must land on a day Destination A owns, not B's.
    expect(dayIndexOf("Near A Attraction")).toBeGreaterThanOrEqual(0);
    expect(dayOwnerOf("Near A Attraction")).toContain("Destination A");

    // Near-B trek must land on a day Destination B owns, not A's.
    expect(dayIndexOf("Near B Trek")).toBeGreaterThanOrEqual(0);
    expect(dayOwnerOf("Near B Trek")).toContain("Destination B");
  });

  it("rotates through multiple selected destinations day by day instead of grouping each into one solid block", () => {
    const destA = destination({ id: "dA", name: "Destination A" });
    const destB = destination({ id: "dB", name: "Destination B" });
    const destC = destination({ id: "dC", name: "Destination C" });

    // 6-day trip across 3 destinations -> each should appear on 2 separate,
    // non-consecutive-block days: A, B, C, A, B, C.
    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["dA", "dB", "dC"], startDate: "2099-06-01", endDate: "2099-06-06" }),
      [destA, destB, destC],
      { attractions: [], treks: [] }
    );

    expect(days).toHaveLength(6);
    const destinationPerDay = days.map((d) => d.activities[0].destinationId);
    expect(destinationPerDay).toEqual(["dA", "dB", "dC", "dA", "dB", "dC"]);

    // No two consecutive days should be the same destination.
    for (let i = 1; i < destinationPerDay.length; i++) {
      expect(destinationPerDay[i]).not.toBe(destinationPerDay[i - 1]);
    }

    // The second visit to each destination reads as a return trip, not a
    // literal repeat of "Arrive & settle in".
    expect(days[3].activities[0].title).toBe("Head back to Destination A");
    expect(days[3].activities[0].title).not.toContain("Arrive & settle in");
  });

  it("keeps a single-destination trip's repeat days as a continuous stay, not a 'return trip'", () => {
    const dest = destination({ id: "d1", name: "Sample Destination" });

    const days = buildSuggestedItinerary(
      plan({ destinationIds: ["d1"], startDate: "2099-06-01", endDate: "2099-06-03" }),
      [dest],
      { attractions: [], treks: [] }
    );

    expect(days[1].activities[0].title).not.toContain("Head back to");
    expect(days[1].activities[0].title).not.toContain("Return to");
  });
});
