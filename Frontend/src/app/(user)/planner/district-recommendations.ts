import type { Destination, TouristAttraction, Trek, Festival } from "@/types";
import type { DistrictFull } from "@/services/content";

/** A single discoverable place, tagged with its content type so the UI and
 *  itinerary builder can tell them apart without re-deriving it. */
export type DiscoveryItem =
  | { kind: "destination"; item: Destination }
  | { kind: "attraction"; item: TouristAttraction }
  | { kind: "trek"; item: Trek }
  | { kind: "festival"; item: Festival };

export interface RecommendationBucket {
  key: string;
  label: string;
  description: string;
  items: DiscoveryItem[];
}

function itemId(i: DiscoveryItem): string {
  return i.item.id;
}

function itemRating(i: DiscoveryItem): number {
  return i.kind === "festival" ? 0 : i.item.rating;
}

function itemReviewCount(i: DiscoveryItem): number {
  return i.kind === "destination" || i.kind === "attraction" ? i.item.reviewCount : 0;
}

/** Pulls the leading integer out of a free-text duration string like
 *  "2-3 days" or "1 day" — good enough to bucket "short trip" content
 *  without needing a structured duration field on every type. */
function leadingDays(text: string | undefined): number | null {
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isReligious(i: DiscoveryItem): boolean {
  if (i.kind === "destination") return i.item.category === "Religious";
  if (i.kind === "attraction") return i.item.category === "Religious Sites";
  if (i.kind === "festival") return i.item.type === "Religious";
  return false;
}

function isCultural(i: DiscoveryItem): boolean {
  if (i.kind === "destination") return i.item.category === "Cultural" || i.item.category === "Heritage";
  if (i.kind === "attraction") return i.item.category === "Cultural Heritage Sites" || i.item.category === "Historical Sites";
  if (i.kind === "festival") return i.item.type === "Cultural";
  return false;
}

function isNature(i: DiscoveryItem): boolean {
  if (i.kind === "destination") return ["Nature", "Lake", "Wildlife"].includes(i.item.category);
  if (i.kind === "attraction") return ["Natural Attractions", "Lakes & Rivers", "National Parks & Wildlife", "Viewpoints"].includes(i.item.category);
  return false;
}

function isTrekking(i: DiscoveryItem): boolean {
  if (i.kind === "destination") return i.item.category === "Trekking";
  if (i.kind === "attraction") return i.item.category === "Mountains & Trekking Routes";
  return i.kind === "trek";
}

function isAdventure(i: DiscoveryItem): boolean {
  if (i.kind === "destination") return i.item.category === "Adventure";
  if (i.kind === "attraction") return i.item.category === "Adventure Activities";
  if (i.kind === "trek") return i.item.difficulty === "Challenging" || i.item.difficulty === "Strenuous";
  return false;
}

function isFamilyFriendly(i: DiscoveryItem): boolean {
  if (i.kind === "destination") return i.item.difficulty === "Easy" || i.item.category === "City";
  if (i.kind === "trek") return i.item.difficulty === "Easy";
  if (i.kind === "attraction") return i.item.category === "Local Experiences" || i.item.category === "Viewpoints";
  return false;
}

function isWeekendTrip(i: DiscoveryItem): boolean {
  if (i.kind === "destination") {
    const days = leadingDays(i.item.recommendedDuration);
    return days !== null && days <= 3;
  }
  if (i.kind === "trek") return i.item.durationDays <= 3;
  return false;
}

function dedupe(items: DiscoveryItem[]): DiscoveryItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = `${i.kind}:${itemId(i)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Rule-based recommendation buckets for a district's discovery step — the
 * same hand-rolled-weighting spirit as recommendations.controller.ts's
 * personalized/similar scoring, just scoped to "everything in this district"
 * instead of the whole catalog, and computed client-side since the district
 * payload is already small and already fully fetched.
 */
export function buildDistrictRecommendations(district: DistrictFull): RecommendationBucket[] {
  const all: DiscoveryItem[] = [
    ...district.destinations.map((item): DiscoveryItem => ({ kind: "destination", item })),
    ...district.attractions.map((item): DiscoveryItem => ({ kind: "attraction", item })),
    ...district.treks.map((item): DiscoveryItem => ({ kind: "trek", item })),
    ...district.festivals.map((item): DiscoveryItem => ({ kind: "festival", item })),
  ];

  const byRatingDesc = [...all].sort((a, b) => itemRating(b) - itemRating(a));

  const mustVisit = byRatingDesc.filter((i) => itemRating(i) >= 4.5).slice(0, 8);

  const hiddenGems = byRatingDesc
    .filter((i) => itemRating(i) >= 4 && itemReviewCount(i) > 0 && itemReviewCount(i) < 25)
    .slice(0, 8);

  const buckets: RecommendationBucket[] = [
    { key: "must-visit", label: "Must Visit", description: "The highest-rated places in this district.", items: mustVisit },
    { key: "hidden-gems", label: "Hidden Gems", description: "Highly rated, but not many reviews yet — worth discovering.", items: hiddenGems },
    { key: "family", label: "Family Friendly", description: "Easygoing places suited to travelling with family.", items: dedupe(all.filter(isFamilyFriendly)).slice(0, 8) },
    { key: "adventure", label: "Adventure", description: "For travellers chasing an adrenaline rush.", items: dedupe(all.filter(isAdventure)).slice(0, 8) },
    { key: "religious", label: "Religious", description: "Temples, shrines and spiritual sites.", items: dedupe(all.filter(isReligious)).slice(0, 8) },
    { key: "cultural", label: "Cultural", description: "Heritage and living culture to explore.", items: dedupe(all.filter(isCultural)).slice(0, 8) },
    { key: "nature", label: "Nature", description: "Lakes, wildlife and the outdoors.", items: dedupe(all.filter(isNature)).slice(0, 8) },
    { key: "trekking", label: "Trekking", description: "Trails and routes through this district.", items: dedupe(all.filter(isTrekking)).slice(0, 8) },
    { key: "weekend", label: "Weekend Trips", description: "Short enough for a 2-3 day getaway.", items: dedupe(all.filter(isWeekendTrip)).slice(0, 8) },
  ];

  return buckets.filter((b) => b.items.length > 0);
}
