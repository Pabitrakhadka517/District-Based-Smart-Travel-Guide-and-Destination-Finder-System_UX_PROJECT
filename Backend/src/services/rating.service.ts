import { Review } from "../models/Review";
import { Destination } from "../models/Destination";

/**
 * Recomputes a destination's aggregate rating/reviewCount from its approved
 * reviews. Called after any write that can change which reviews count:
 * creating/editing/moderating/deleting a review, or cascading away a user
 * (and therefore their reviews). Uses aggregation instead of fetching full
 * documents — O(n) → O(1) DB work.
 */
export async function recomputeDestinationRating(destinationId: string): Promise<void> {
  const [result] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { destinationId, status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);

  if (!result) return; // No approved reviews — leave current rating intact
  await Destination.updateOne(
    { id: destinationId },
    { rating: Math.round(result.avg * 10) / 10, reviewCount: result.count }
  );
}
