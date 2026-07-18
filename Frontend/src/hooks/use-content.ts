"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/services/api-client";
import { districtService } from "@/services/districtService";
import { attractionService } from "@/services/attractionService";
import { reviewService } from "@/services/reviewService";
import { wishlistService } from "@/services/wishlistService";
import { tripService } from "@/services/tripService";
import { bookingService } from "@/services/bookingService";
import { notificationService } from "@/services/notificationService";
import { profileService } from "@/services/profileService";
import { searchService } from "@/services/searchService";
import { recommendationService } from "@/services/recommendationService";
import { useAuth } from "@/store/auth-store";
import type {
  Destination, District, Review, Trek,
  Festival, GuideArticle, TripPlan, User, WeatherDay, TouristAttraction, ActivityEvent,
  WeatherInsight, CloudinaryImage, TravelAlert, PackingChecklist, Booking, Notification,
} from "@/types";
import type { PlatformStats } from "@/services/content";

export interface AdminAnalytics {
  totalUsers: number;
  totalDestinations: number;
  totalReviews: number;
  totalTrips: number;
  pendingReviews: number;
  avgRating: number;
  userGrowthPct: number | null;
  userGrowth: Array<{ label: string; value: number }>;
  recentActivity: Array<{ who: string; action: string; time: string }>;
}

/* ----------------------------- Districts -------------------------------- */

export function useDistricts() {
  return useQuery({
    queryKey: ["districts"],
    queryFn: () => districtService.getAll(),
  });
}

export function useDistrictAttractions(districtSlug: string, category?: string) {
  return useQuery({
    queryKey: ["district-attractions", districtSlug, category],
    queryFn: () => districtService.getAttractions(districtSlug, category),
    enabled: !!districtSlug,
  });
}

/** Full district tourism-hub payload (all destinations/attractions/treks/
 *  festivals/guides for one district) — the data source for the Trip
 *  Planner's district-first discovery step. */
export function useDistrictFull(districtSlug: string) {
  return useQuery({
    queryKey: ["district-full", districtSlug],
    queryFn: () => districtService.getFull(districtSlug),
    enabled: !!districtSlug,
    staleTime: 5 * 60 * 1000,
  });
}

/* ----------------------------- Attractions ------------------------------ */

export function useAttractions(params = "", initialData?: TouristAttraction[]) {
  return useQuery({
    queryKey: ["attractions", params],
    queryFn: () => attractionService.getAll(params),
    initialData,
  });
}

export function useFeaturedAttractions() {
  return useQuery({
    queryKey: ["attractions", "?featured=1"],
    queryFn: () => attractionService.getFeatured(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrendingAttractions() {
  return useQuery({
    queryKey: ["attractions", "?trending=1"],
    queryFn: () => attractionService.getTrending(),
    staleTime: 5 * 60 * 1000,
  });
}

/* ----------------------------- Destinations ----------------------------- */

export function useDestinations(params = "", initialData?: Destination[]) {
  return useQuery({
    queryKey: ["destinations", params],
    queryFn: () => apiGet<Destination[]>(`/destinations${params}`),
    initialData,
  });
}

export function useTreks(params = "", initialData?: Trek[]) {
  return useQuery({
    queryKey: ["treks", params],
    queryFn: () => apiGet<Trek[]>(`/treks${params}`),
    initialData,
  });
}

export function useFestivals(initialData?: Festival[]) {
  return useQuery({
    queryKey: ["festivals"],
    queryFn: () => apiGet<Festival[]>("/festivals"),
    initialData,
  });
}

export function useGuides(params = "", initialData?: GuideArticle[]) {
  return useQuery({
    queryKey: ["guides", params],
    queryFn: () => apiGet<GuideArticle[]>(`/guides${params}`),
    initialData,
  });
}

/* ----------------------------- Travel Alerts ----------------------------- */

export function useTravelAlerts(initialData?: TravelAlert[]) {
  return useQuery({
    queryKey: ["travel-alerts"],
    queryFn: () => apiGet<TravelAlert[]>("/travel-alerts"),
    initialData,
    staleTime: 5 * 60 * 1000,
  });
}

/* ----------------------------- Checklists -------------------------------- */

export function usePackingChecklists(initialData?: PackingChecklist[]) {
  return useQuery({
    queryKey: ["checklists"],
    queryFn: () => apiGet<PackingChecklist[]>("/checklists"),
    initialData,
    staleTime: 30 * 60 * 1000,
  });
}

/* ----------------------------- Popular Searches --------------------------- */

export function usePopularSearches(initialData?: string[]) {
  return useQuery({
    queryKey: ["popular-searches"],
    queryFn: () => apiGet<string[]>("/search/popular"),
    initialData,
    staleTime: 15 * 60 * 1000,
  });
}

/* ----------------------------- Search ----------------------------------- */

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchService.search(query),
    enabled: query.length > 0,
  });
}

/* ----------------------------- Reviews ---------------------------------- */

export function useReviews(destinationId: string) {
  return useQuery({
    queryKey: ["reviews", destinationId],
    queryFn: () => reviewService.getByDestination(destinationId),
    enabled: !!destinationId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Review>) => reviewService.create(payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reviews", vars.destinationId] });
    },
  });
}

export function useUpdateReview() {
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<Pick<Review, "rating" | "title" | "body" | "photos">>) =>
      reviewService.update(id, payload),
  });
}

export function useDeleteReview() {
  return useMutation({
    mutationFn: (id: string) => reviewService.remove(id),
  });
}

/* ----------------------------- Wishlist --------------------------------- */

export function useWishlistApi() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => wishlistService.get(),
    enabled: isLoggedIn(),
    retry: false,
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (destinationId: string) => wishlistService.add(destinationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (destinationId: string) => wishlistService.remove(destinationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });
}

/* ----------------------------- Trip Planner ----------------------------- */

export function usePlans() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => tripService.getAll(),
    enabled: isLoggedIn(),
    retry: false,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<TripPlan>) => tripService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<TripPlan> & { id: string }) =>
      tripService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tripService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

/* ----------------------------- Bookings ---------------------------------- */

export function useBookings() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingService.getAll(),
    enabled: isLoggedIn(),
    retry: false,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Booking>) => bookingService.create(payload),
    // Booking a trip plan also flips that plan's status/bookingId server-side
    // (see createBooking in booking.controller.ts), so the cached plan list
    // needs refetching too, not just the bookings list.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingService.updateStatus(id, "cancelled"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

/* --------------------------- Notifications ------------------------------- */

export function useNotifications() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll(),
    enabled: isLoggedIn(),
    retry: false,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// Admin-broadcast queue (pending bookings/reviews) — only ever mounted inside
// the admin layout, which already implies an authenticated admin, so unlike
// useNotifications this doesn't need an `enabled: isLoggedIn()` guard.
export function useAdminNotifications() {
  return useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => apiGet<{ items: Notification[]; unreadCount: number }>("/admin/notifications", true),
    refetchInterval: 60_000,
  });
}

export function useMarkAdminNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch<Notification>(`/admin/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
}

export function useMarkAllAdminNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPatch<null>("/admin/notifications/read-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
}

/* ----------------------------- User / Auth ------------------------------ */

export function useCurrentUser() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => profileService.getMe(),
    enabled: isLoggedIn(),
    retry: false,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (payload: { name?: string; avatar?: CloudinaryImage }) =>
      profileService.update(payload),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      qc.setQueryData(["currentUser"], updatedUser);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      profileService.changePassword(payload),
  });
}

export function useLogout() {
  const { clearAuth } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost("/auth/logout", {}, true),
    onSettled: () => {
      clearAuth();
      qc.clear();
      router.push("/login");
    },
  });
}

export function useLogoutAll() {
  const { clearAuth } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost("/auth/logout-all", {}, true),
    onSettled: () => {
      clearAuth();
      qc.clear();
      router.push("/login");
    },
  });
}

/* ----------------------------- Stats ------------------------------------ */

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => apiGet<PlatformStats>("/stats"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => apiGet<AdminAnalytics>("/admin/analytics", true),
    staleTime: 60 * 1000,
  });
}

/* ----------------------------- Recommendations -------------------------- */

export function usePersonalizedRecommendations() {
  const loggedIn = useAuth((s) => !!s.user);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nepayatra_recently_viewed");
      setViewedIds(raw ? (JSON.parse(raw) as string[]).slice(0, 10) : []);
    } catch {
      setViewedIds([]);
    }
  }, []);
  return useQuery({
    queryKey: ["recommendations", "personalized", viewedIds.slice(0, 5)],
    queryFn: () => recommendationService.getPersonalized(viewedIds),
    enabled: loggedIn,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSimilarDestinations(slug: string) {
  return useQuery({
    queryKey: ["recommendations", "similar", slug],
    queryFn: () => recommendationService.getSimilar(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrendingRecommendations() {
  return useQuery({
    queryKey: ["recommendations", "trending"],
    queryFn: () => recommendationService.getTrending(),
    staleTime: 15 * 60 * 1000,
  });
}

/* ----------------------------- User Reviews ----------------------------- */

export function useUserReviews(userId: string) {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["reviews", "user", userId],
    queryFn: () => apiGet<Review[]>(`/reviews?user=${userId}`, true),
    enabled: isLoggedIn() && !!userId,
    retry: false,
  });
}

/* ----------------------------- Search Autocomplete ---------------------- */

export function useSearchAutocomplete(query: string) {
  return useQuery({
    queryKey: ["search-autocomplete", query],
    queryFn: () => searchService.search(`q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

/* ----------------------------- Helpful Votes ---------------------------- */

export function useVoteHelpful() {
  return useMutation({
    mutationFn: (reviewId: string) => reviewService.voteHelpful(reviewId),
  });
}

/* ----------------------------- Activity Timeline ------------------------- */

export function useActivityTimeline() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => apiGet<ActivityEvent[]>("/dashboard/activity", true),
    enabled: isLoggedIn(),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

/* ----------------------------- Weather Insight --------------------------- */

export function useWeatherInsight(slug: string) {
  return useQuery({
    queryKey: ["weather-insight", slug],
    queryFn: () => apiGet<WeatherInsight>(`/destinations/${slug}/weather-insight`),
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}

/* ----------------------------- Weather ---------------------------------- */

function wmoToCondition(code: number): WeatherDay["condition"] {
  if (code === 0) return "Sunny";
  if (code <= 2) return "Clear";
  if (code <= 48) return "Cloudy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain";
  if (code <= 86) return "Snow";
  return "Rain";
}

export function useWeather(lat: number, lng: number) {
  return useQuery({
    queryKey: ["weather", lat, lng],
    queryFn: async (): Promise<WeatherDay[]> => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia%2FKathmandu&forecast_days=7`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather fetch failed");
      const data = await res.json() as {
        daily: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          weathercode: number[];
        };
      };
      const { time, temperature_2m_max, temperature_2m_min, weathercode } = data.daily;
      return time.map((t, i) => ({
        day: new Date(t).toLocaleDateString("en-US", { weekday: "short" }),
        condition: wmoToCondition(weathercode[i]),
        high: Math.round(temperature_2m_max[i]),
        low: Math.round(temperature_2m_min[i]),
      }));
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
