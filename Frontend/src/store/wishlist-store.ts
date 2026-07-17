"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  ids: string[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  /** Replaces local state with the authenticated user's server-side wishlist —
   *  the server is the source of truth, so this also correctly drops any id
   *  that was removed elsewhere (another device, another session) since the
   *  last sync, instead of leaving it stuck locally forever. */
  merge: (serverIds: string[]) => void;
  clear: () => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id]
        })),
      has: (id) => get().ids.includes(id),
      merge: (serverIds) => set({ ids: [...serverIds] }),
      clear: () => set({ ids: [] })
    }),
    {
      name: "nepayatra-wishlist",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
