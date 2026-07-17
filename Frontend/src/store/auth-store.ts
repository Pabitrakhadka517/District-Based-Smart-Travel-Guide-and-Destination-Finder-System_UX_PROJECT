"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { useWishlist } from "@/store/wishlist-store";

const SESSION_COOKIE = "nepayatra_session";
const ROLE_COOKIE = "nepayatra_role";

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (token: string, user: User, rememberMe?: boolean) => void;
  updateUser: (user: User) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
  isLoggedIn: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      setAuth: (token, user, rememberMe = false) => {
        // Session cookies let the Next.js middleware know the user is logged in
        const days = rememberMe ? 30 : 7;
        setCookie(SESSION_COOKIE, "1", days);
        setCookie(ROLE_COOKIE, user.role, days);
        set({ token, user });
      },

      updateUser: (user) => {
        set({ user });
      },

      clearAuth: () => {
        clearCookie(SESSION_COOKIE);
        clearCookie(ROLE_COOKIE);
        set({ token: null, user: null });
        // Prevents the next person on a shared/public browser from seeing (or
        // accidentally re-saving into their own account) the previous user's wishlist.
        useWishlist.getState().clear();
      },

      isAdmin: () => get().user?.role === "admin",
      // Login state is judged by `user`, not `token`: the access token now lives
      // only in an httpOnly cookie (never in JS-readable storage, so an XSS bug
      // can't exfiltrate it) and isn't persisted here at all — see partialize below.
      isLoggedIn: () => !!get().user
    }),
    {
      name: "nepayatra-auth",
      // Deliberately excludes `token` — it's kept in memory for this tab's
      // lifetime (see setAuth/clearAuth) but never written to localStorage.
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
