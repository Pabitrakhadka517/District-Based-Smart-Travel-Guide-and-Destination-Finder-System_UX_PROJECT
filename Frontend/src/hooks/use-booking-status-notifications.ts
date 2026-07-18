"use client";
import { useEffect } from "react";
import { toast } from "@/store/toast-store";
import type { Booking } from "@/types";

const STORAGE_KEY = "nepayatra:booking-status-seen";

type StatusMap = Record<string, Booking["status"]>;

function readSeenStatuses(): StatusMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatusMap) : {};
  } catch {
    return {};
  }
}

function writeSeenStatuses(map: StatusMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* localStorage unavailable (private browsing, quota) — notifications just won't persist across visits */
  }
}

const STATUS_MESSAGE: Partial<Record<Booking["status"], (destinationName: string) => { variant: "success" | "error" | "info"; message: string }>> = {
  confirmed: (name) => ({ variant: "success", message: `Your booking for ${name} has been confirmed!` }),
  cancelled: (name) => ({ variant: "error", message: `Your booking for ${name} was cancelled.` }),
  completed: (name) => ({ variant: "info", message: `Your trip to ${name} has been marked completed.` }),
};

/**
 * Surfaces a toast the next time the traveller visits with a booking whose
 * status changed since their last visit (e.g. an admin approved or rejected
 * it while they were away) — there's no in-app notification system in this
 * app, and reading a confirmation/cancellation email isn't guaranteed, so
 * this closes the loop with a plain localStorage comparison against what was
 * last seen per booking id instead of new backend/push infrastructure.
 *
 * Silent on the first-ever sight of a booking (nothing to compare against
 * yet) — otherwise every pre-existing confirmed/cancelled booking would
 * toast the moment this shipped, which isn't a real status *change*.
 */
export function useBookingStatusNotifications(
  bookings: Booking[],
  destinationNameById: Record<string, string>
): void {
  useEffect(() => {
    if (bookings.length === 0) return;
    // Destinations load via a separate query than bookings — if it hasn't
    // resolved yet, every lookup below would miss and fall back to a generic
    // "your destination" in the toast. Since a detected transition gets
    // marked "seen" the moment it's processed, firing early here would mean
    // the correct name is lost for good once destinations do load (the
    // re-run would see the status as already-seen and stay silent). Wait for
    // a non-empty map instead of guessing.
    if (Object.keys(destinationNameById).length === 0) return;

    const seen = readSeenStatuses();
    const next: StatusMap = { ...seen };
    let changed = false;

    for (const booking of bookings) {
      const prior = seen[booking.id];
      if (prior === booking.status) continue;

      if (prior) {
        const notify = STATUS_MESSAGE[booking.status];
        if (notify) {
          const name = destinationNameById[booking.destinationId] ?? "your destination";
          const { variant, message } = notify(name);
          toast[variant](message);
        }
      }
      next[booking.id] = booking.status;
      changed = true;
    }

    if (changed) writeSeenStatuses(next);
  }, [bookings, destinationNameById]);
}
