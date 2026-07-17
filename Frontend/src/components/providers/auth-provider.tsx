"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth-store";
import { useWishlist } from "@/store/wishlist-store";
import { apiGet } from "@/services/api-client";
import type { User } from "@/types";

/**
 * Listens for custom DOM events dispatched by the API client:
 *  - "nepayatra:logout"        → clears auth state + redirects to /login
 *  - "nepayatra:token-refresh" → syncs the refreshed user into the store
 *    (the token itself lives only in an httpOnly cookie now, set directly by
 *    the backend — there's nothing for this event to carry or store)
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { clearAuth, updateUser, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function onLogout() {
      clearAuth();
      router.push("/login");
    }

    function onRefresh(e: Event) {
      const { user: refreshedUser } = (e as CustomEvent<{ user: User }>).detail;
      if (refreshedUser) {
        updateUser(refreshedUser);
      }
    }

    window.addEventListener("nepayatra:logout", onLogout);
    window.addEventListener("nepayatra:token-refresh", onRefresh as EventListener);
    return () => {
      window.removeEventListener("nepayatra:logout", onLogout);
      window.removeEventListener("nepayatra:token-refresh", onRefresh as EventListener);
    };
  }, [clearAuth, updateUser, router]);

  // Pulls the server-side wishlist into the local store once per login, so the
  // heart icon reflects saved destinations everywhere (not just the /wishlist
  // page) even on a browser/device that never saved them locally before.
  // Keyed on `user` (persisted) rather than `token` (in-memory only, so it's
  // unset again immediately after every page load even for a still-logged-in
  // session) — otherwise this would silently stop firing on refresh.
  useEffect(() => {
    if (!user) return;
    apiGet<{ ids: string[] }>("/wishlist", true)
      .then(({ ids }) => useWishlist.getState().merge(ids))
      .catch(() => {});
  }, [user]);

  return <>{children}</>;
}
