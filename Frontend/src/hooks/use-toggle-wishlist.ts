"use client";
import { useRef } from "react";
import { useWishlist } from "@/store/wishlist-store";
import { useAuth } from "@/store/auth-store";
import { useAddToWishlist, useRemoveFromWishlist } from "@/hooks/use-content";
import { toast } from "@/store/toast-store";

/**
 * Unified wishlist toggle: updates local Zustand store instantly (optimistic)
 * AND syncs to the backend API when the user is logged in. On failure, the
 * optimistic update is rolled back and the user is told — previously a
 * rejected request (e.g. adding an id the server doesn't recognize) left the
 * heart looking "saved" forever with nothing actually persisted.
 */
export function useToggleWishlist() {
  const { toggle, has } = useWishlist();
  const loggedIn = useAuth((s) => !!s.user);
  const add = useAddToWishlist();
  const remove = useRemoveFromWishlist();
  // Tracks ids with a request in flight so a rapid double-click can't fire an
  // add and a remove concurrently and leave the server in the wrong order-dependent state.
  const pending = useRef<Set<string>>(new Set());

  return (id: string) => {
    if (pending.current.has(id)) return;

    const wasSaved = has(id);
    toggle(id); // optimistic local update

    if (loggedIn) {
      pending.current.add(id);
      const onSettled = () => pending.current.delete(id);
      const onError = (err: unknown) => {
        toggle(id); // roll back the optimistic update
        toast.error(err instanceof Error ? err.message : "Couldn't update your wishlist. Please try again.");
      };
      if (wasSaved) {
        remove.mutate(id, { onSettled, onError });
      } else {
        add.mutate(id, { onSettled, onError });
      }
    }
  };
}
