import type { Coordinates, Destination, TouristAttraction, Trek, TripActivity, TripDay, TripPlan } from "@/types";
import { dateRange, nanoid } from "./planner-utils";

/** Picks the i-th element of a list without wrapping — returns undefined once
 *  the list is exhausted instead of looping back to repeat earlier items.
 *  (An earlier modulo-based "cycle" used here caused the same suggestion to
 *  show up on multiple days whenever a list was shorter than the number of
 *  days consuming it — e.g. a single selected attraction landing on every
 *  day, or a destination with only 2 curated highlights repeating them on
 *  day 3 of a 3-day stay.) */
function pick<T>(list: T[], i: number): T | undefined {
  return i < list.length ? list[i] : undefined;
}

// Rotates through a few phrasings for "you're still at this destination"
// days so a multi-day stay doesn't show the literal same activity title
// ("Explore X") on every day after the first.
const CONTINUING_PHRASES = ["Explore", "Discover more of", "Continue exploring", "Wander around"];

// Used instead of CONTINUING_PHRASES when the itinerary rotates through
// multiple destinations day by day — coming back to a place after a day
// spent somewhere else reads as a return trip, not a continuous stay.
const RETURN_PHRASES = ["Head back to", "Return to", "Back for more of", "Revisit"];

/** Straight-line distance-squared — plenty precise for picking the nearest
 *  of a handful of same-district destinations; a real haversine would be
 *  overkill here. */
function dist2(a: Coordinates, b: Coordinates): number {
  const dx = a.lat - b.lat;
  const dy = a.lng - b.lng;
  return dx * dx + dy * dy;
}

/** Which trip destination a coordinate is geographically closest to — used
 *  to attach a standalone selected attraction/trek to the destination it
 *  actually belongs near, instead of scattering it across whichever day
 *  happens to line up by index. */
function nearestDestinationIndex(coord: Coordinates, tripDestinations: Destination[]): number {
  let bestIndex = 0;
  let bestDist = Infinity;
  tripDestinations.forEach((d, i) => {
    const d2 = dist2(coord, d.coordinates);
    if (d2 < bestDist) {
      bestDist = d2;
      bestIndex = i;
    }
  });
  return bestIndex;
}

function suggestedActivity(partial: Omit<TripActivity, "id" | "notes" | "visited" | "suggested"> & { notes?: string }): TripActivity {
  return {
    id: nanoid(),
    notes: "",
    visited: false,
    suggested: true,
    ...partial,
  };
}

/** Everything a trip plan can reference from the district-discovery step,
 *  resolved to the full documents so a suggestion can use their real
 *  name/id — the plan itself only stores id arrays. */
export interface SelectedContent {
  attractions: TouristAttraction[];
  treks: Trek[];
}

/**
 * Builds a day-by-day itinerary from the trip's own destinations — their
 * curated highlight attractions, activities, and local foods already live on
 * the Destination document, so a first draft can be assembled without asking
 * the traveller to start from a blank page. Every generated activity is
 * flagged `suggested: true`; the ItineraryBuilder clears that flag the moment
 * the traveller edits it, and nothing here is saved until the caller pushes
 * the result through the normal `onChange`/autosave path.
 *
 * When more than one destination is selected, the itinerary rotates through
 * all of them day by day (Day 1 = destination A, Day 2 = B, Day 3 = C, Day 4
 * = back to A, ...) instead of grouping every destination into one solid
 * block of consecutive days — each day in the trip surfaces a different
 * destination and different activities rather than "Day 1/2/3: Kathmandu"
 * repeated three times in a row. A single-destination trip is unaffected:
 * with only one destination to rotate through, every day still lands on it.
 *
 * Standalone attractions/treks picked in the discovery step (not just a
 * destination's own embedded highlights) are each matched to whichever trip
 * destination they're geographically closest to, so they only ever surface
 * on a day that destination actually owns — never something picked because
 * of a different destination elsewhere in the trip. Whatever doesn't fit
 * within that destination's own visits stays unplaced, ready to be dragged
 * in manually from the ItineraryBuilder's "unassigned" tray.
 *
 * Returns [] if there isn't enough to work with (no dates, or no destinations
 * matched) — callers should fall back to blank days in that case.
 */
export function buildSuggestedItinerary(
  plan: TripPlan,
  destinations: Destination[],
  selected: SelectedContent = { attractions: [], treks: [] }
): TripDay[] {
  const dates = dateRange(plan.startDate, plan.endDate);
  const tripDestinations = plan.destinationIds
    .map((id) => destinations.find((d) => d.id === id))
    .filter((d): d is Destination => !!d);

  if (dates.length === 0 || tripDestinations.length === 0) return [];

  // Every standalone selected attraction/trek gets attached to whichever
  // trip destination it's nearest to, so it only ever surfaces on a day
  // that destination actually owns. Within each destination's bucket, order
  // is preserved (attractions before treks) and each item is used at most
  // once (see `pick`), never repeated across days.
  type Extra = { title: string; type: "attraction" | "trek"; id: string };
  const extrasByDestination: Extra[][] = tripDestinations.map(() => []);
  for (const a of selected.attractions) {
    extrasByDestination[nearestDestinationIndex(a.coordinates, tripDestinations)].push({ title: a.name, type: "attraction", id: a.id });
  }
  for (const t of selected.treks) {
    extrasByDestination[nearestDestinationIndex(t.coordinates, tripDestinations)].push({ title: t.name, type: "trek", id: t.id });
  }

  return dates.map((date, i) => {
    const destIndex = i % tripDestinations.length;
    const destination = tripDestinations[destIndex];
    // How many times we've already landed on this destination before today —
    // 0 the first time, 1 the second time (after visiting others in between),
    // and so on. Drives which highlight/food/extra this particular visit
    // gets, so a returning visit never repeats what an earlier visit showed.
    const visitNumber = Math.floor(i / tripDestinations.length);
    const isFirstVisit = visitNumber === 0;

    const activities: TripActivity[] = [];

    // A single-destination trip never actually leaves, so a repeat day there
    // is a continuous stay ("Explore more of X"); with multiple destinations
    // rotating through the trip, a repeat day means the traveller left and
    // came back, which reads better as a return trip ("Head back to X").
    const phrase = tripDestinations.length > 1
      ? `${RETURN_PHRASES[(visitNumber - 1) % RETURN_PHRASES.length]} ${destination.name}`
      : `${CONTINUING_PHRASES[(visitNumber - 1) % CONTINUING_PHRASES.length]} ${destination.name}`;
    const title = isFirstVisit ? `Arrive & settle in — ${destination.name}` : phrase;
    // A return visit after travelling elsewhere starts a bit later than a
    // same-place continuing day, which can start as early as the traveller likes.
    const arrivalTime = isFirstVisit ? "09:00" : tripDestinations.length > 1 ? "09:30" : "08:30";
    activities.push(
      suggestedActivity({
        time: arrivalTime,
        title,
        type: "destination",
        destinationId: destination.id,
        location: destination.name,
      })
    );

    // Two curated highlights per visit, drawn from a combined pool of this
    // destination's curated attraction highlights plus its general activity
    // tags (deduped case-insensitively — some destinations' seed data lists
    // the same real activity in both fields with slightly different casing,
    // e.g. "Jeep Safari" as a curated attraction and "Jeep safari" as a plain
    // activity tag; an exact-string dedup would let both through as if they
    // were distinct suggestions) — the wider pool means fewer visits run out
    // of something new to suggest. Each highlight is used at most once across
    // the whole trip; once the pool is exhausted, later visits simply get
    // fewer suggested activities instead of repeating an earlier one.
    const seenTitles = new Set<string>();
    const highlights = [
      ...destination.attractions.map((a) => ({ title: a.name, notes: a.description })),
      ...destination.activities.map((a) => ({ title: a, notes: "" })),
    ].filter((h) => {
      const key = h.title.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    for (let h = 0; h < 2; h++) {
      const highlight = pick(highlights, visitNumber * 2 + h);
      if (!highlight) continue;
      activities.push(
        suggestedActivity({
          time: h === 0 ? "11:30" : "15:00",
          title: highlight.title,
          type: "attraction",
          destinationId: destination.id,
          notes: highlight.notes,
        })
      );
    }

    const food = pick(destination.localFoods, visitNumber);
    if (food) {
      activities.push(
        suggestedActivity({
          time: "18:30",
          title: `Try local food — ${food}`,
          type: "custom",
          destinationId: destination.id,
        })
      );
    }

    const extra = pick(extrasByDestination[destIndex], visitNumber);
    if (extra) {
      activities.push(
        suggestedActivity({
          time: "16:30",
          title: extra.title,
          type: extra.type,
          destinationId: extra.id,
        })
      );
    }

    return {
      id: nanoid(),
      day: i + 1,
      date,
      title: `Day ${i + 1} · ${destination.name}`,
      activities,
    };
  });
}
