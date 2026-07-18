import type { District, Destination, Review, Trek, Festival, GuideArticle, TouristAttraction, RatingBreakdown, WeatherInsight, TravelAlert, PackingChecklist } from "@/types";

export interface PlatformStats {
  destinations: number;
  districts: number;
  reviews: number;
  users: number;
  avgRating: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// Throws on any failure (network error or non-2xx) so the nearest Next.js
// error boundary (app/error.tsx) can show a real error instead of the page
// silently rendering as if the data were genuinely empty.
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`);
  const json = await res.json();
  return json.data as T;
}

/** Like `get`, but keeps `total` from a paginated list endpoint instead of
 *  discarding it — used by admin list pages so a real overflow past the
 *  fetch limit can be surfaced instead of silently truncating. */
export async function getPaginated<T>(path: string): Promise<{ data: T[]; total: number }> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`);
  const json = await res.json();
  const data = (json.data as T[]) ?? [];
  return { data, total: (json.total as number) ?? data.length };
}

// Explicit high limit (matching the backend's global maxLimit ceiling) rather than
// relying on each resource's smaller default — keeps "fetch everything" callers
// (admin tables, public list pages) from silently truncating as the catalog grows.
export const getDistricts = () => get<District[]>("/districts?limit=500");
export const getDistrict = async (slug: string): Promise<District | null> => {
  const res = await fetch(`${API}/districts/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /districts/${slug} failed with status ${res.status}`);
  const json = await res.json();
  // Backend returns the full district hub payload — extract just the district
  return (json.data?.district as District) ?? null;
};

export interface DistrictFull {
  district: District;
  destinations: Destination[];
  attractions: TouristAttraction[];
  treks: Trek[];
  festivals: Festival[];
  guides: GuideArticle[];
  reviews: Review[];
  weather: WeatherInsight;
  nearbyDistricts: District[];
  recommended: Destination[];
  counts: { cityCount: number; destinationCount: number; attractionCount: number };
}

export const getDistrictFull = async (slug: string): Promise<DistrictFull | null> => {
  const res = await fetch(`${API}/districts/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /districts/${slug} failed with status ${res.status}`);
  const json = await res.json();
  return json.data ?? null;
};

export const getDestinations = () => get<Destination[]>("/destinations?limit=500");
export const getDestination = async (slug: string): Promise<Destination | null> => {
  const res = await fetch(`${API}/destinations/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /destinations/${slug} failed with status ${res.status}`);
  const json = await res.json();
  // Backend returns { destination, reviews, nearby } — extract just the destination
  return (json.data?.destination as Destination) ?? null;
};

export interface DestinationFull {
  destination: Destination;
  reviews: Review[];
  nearby: Destination[];
  ratingBreakdown: RatingBreakdown[];
  similar: Destination[];
  nearbyAttractions: TouristAttraction[];
}

export const getDestinationFull = async (slug: string): Promise<DestinationFull | null> => {
  const res = await fetch(`${API}/destinations/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /destinations/${slug} failed with status ${res.status}`);
  const json = await res.json();
  return json.data ?? null;
};
export const getFeatured = () => get<Destination[]>("/destinations?featured=1");
export const getTrending = () => get<Destination[]>("/destinations?trending=1");
export const getNearby = (ids: string[]) => get<Destination[]>(`/destinations?ids=${ids.join(",")}`);

export const getReviews = (destinationId?: string) =>
  get<Review[]>(destinationId ? `/reviews?destination=${destinationId}` : "/reviews");

export const getTreks = () => get<Trek[]>("/treks?limit=500");
export const getTrek = async (slug: string): Promise<Trek | null> => {
  const res = await fetch(`${API}/treks/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /treks/${slug} failed with status ${res.status}`);
  const json = await res.json();
  return (json.data as Trek) ?? null;
};
export const getFeaturedTreks = () => get<Trek[]>("/treks?featured=1");

export const getFestivals = () => get<Festival[]>("/festivals?limit=500");
export const getFestival = async (slug: string): Promise<Festival | null> => {
  const res = await fetch(`${API}/festivals/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /festivals/${slug} failed with status ${res.status}`);
  const json = await res.json();
  return (json.data as Festival) ?? null;
};

export const getGuides = () => get<GuideArticle[]>("/guides?limit=500");
export const getGuide = async (slug: string): Promise<GuideArticle | null> => {
  const res = await fetch(`${API}/guides/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /guides/${slug} failed with status ${res.status}`);
  const json = await res.json();
  return (json.data as GuideArticle) ?? null;
};
export const getFeaturedGuides = () => get<GuideArticle[]>("/guides?featured=1");

export const getStats = () => get<PlatformStats>("/stats");
export const getTopReviews = () => get<Review[]>("/reviews?status=approved");

export const getAttractions = (params = "") =>
  get<TouristAttraction[]>(`/attractions${params}${params.includes("?") ? "&" : "?"}limit=500`);

export const getDistrictAttractions = (districtSlug: string) =>
  get<TouristAttraction[]>(`/districts/${districtSlug}/attractions`);

export const getTravelAlerts = () => get<TravelAlert[]>("/travel-alerts");
export const getPackingChecklists = () => get<PackingChecklist[]>("/checklists");
export const getPopularSearches = () => get<string[]>("/search/popular");

export const getAttraction = async (
  slug: string
): Promise<{ attraction: TouristAttraction; nearby: TouristAttraction[] } | null> => {
  const res = await fetch(`${API}/attractions/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /attractions/${slug} failed with status ${res.status}`);
  const json = await res.json();
  return json.data ?? null;
};
