import { Review } from "../models/Review";
import { Booking } from "../models/Booking";
import { Notification } from "../models/Notification";
import { User } from "../models/User";
import { TripPlan } from "../models/TripPlan";
import { City } from "../models/City";
import { Attraction } from "../models/Attraction";
import { Festival } from "../models/Festival";
import { Guide } from "../models/Guide";
import { Trek } from "../models/Trek";
import { Destination } from "../models/Destination";
import { cleanupReplacedImages } from "./cloudinary.service";
import { recomputeDestinationRating } from "./rating.service";

/**
 * No model in this codebase uses Mongoose ObjectId `ref`s (every relation is a
 * hand-rolled string id), so nothing is enforced or cascaded at the schema
 * level. These helpers do it explicitly wherever a parent delete would
 * otherwise orphan child documents or leave dangling id references.
 */

/** Removes every trace of a single destination: its own reviews/bookings, and
 *  any wishlist/trip-plan entries that reference it. Does NOT delete the
 *  destination document itself — callers do that (they may need its images
 *  first for Cloudinary cleanup). */
export async function cascadeDestinationReferences(destinationId: string): Promise<void> {
  // Bookings whose *primary* destination is being deleted are removed outright
  // below (there's no remaining destination left to book) — but any TripPlan
  // marked "booked" against one of them must be reverted too, or it's left
  // pointing at a bookingId that no longer resolves to anything (it would
  // then silently vanish from Travel Tracking with no cancellation record).
  const orphanedBookings = await Booking.find({ destinationId }).select("id tripPlanId").lean();

  await Promise.all([
    Review.deleteMany({ destinationId }),
    Booking.deleteMany({ destinationId }),
    // A multi-destination booking's primary `destinationId` may point elsewhere,
    // so it survives the deleteMany above — still strip the deleted id out of
    // its `destinationIds` snapshot so it doesn't dangle.
    Booking.updateMany(
      { destinationIds: destinationId },
      { $pull: { destinationIds: destinationId } }
    ),
    User.updateMany({ wishlist: destinationId }, { $pull: { wishlist: destinationId } }),
    TripPlan.updateMany(
      { destinationIds: destinationId },
      { $pull: { destinationIds: destinationId } }
    ),
    ...orphanedBookings.map((b) =>
      TripPlan.updateOne(
        { id: b.tripPlanId, bookingId: b.id, status: "booked" },
        { $set: { status: "ready", bookingId: "" } }
      )
    )
  ]);
}

/** A City's Destinations require a cityId (not optional), so a City delete
 *  can't just null the reference without violating the schema — cascade the
 *  same way a District delete cascades its own Destinations. */
export async function cascadeCityReferences(cityId: string): Promise<void> {
  const destinations = await Destination.find({ cityId }).select("id heroImage gallery");

  await Promise.all(destinations.map((d) => cascadeDestinationReferences(d.id)));
  for (const d of destinations) cleanupReplacedImages([d.heroImage, d.gallery], []);

  await Destination.deleteMany({ cityId });
}

/** Attractions reference each other via a plain string-id array
 *  (`nearbyAttractions`), so deleting one leaves dangling ids in whichever
 *  other attractions listed it as nearby. */
export async function cascadeAttractionReferences(attractionId: string): Promise<void> {
  await Promise.all([
    Attraction.updateMany(
      { nearbyAttractions: attractionId },
      { $pull: { nearbyAttractions: attractionId } }
    ),
    // Wishlist ids can point at either a Destination or an Attraction (see
    // wishlist.controller.ts) — mirror cascadeDestinationReferences so a
    // deleted attraction doesn't linger in anyone's wishlist.
    User.updateMany({ wishlist: attractionId }, { $pull: { wishlist: attractionId } }),
    TripPlan.updateMany(
      { attractionIds: attractionId },
      { $pull: { attractionIds: attractionId } }
    )
  ]);
}

/** A deleted Trek would otherwise dangle in any TripPlan's `trekIds` snapshot. */
export async function cascadeTrekReferences(trekId: string): Promise<void> {
  await TripPlan.updateMany(
    { trekIds: trekId },
    { $pull: { trekIds: trekId } }
  );
}

/** Cascades everything that hangs off a district before it (or its
 *  destinations) can be safely deleted. Also cleans up every Cloudinary
 *  image owned by the cascaded documents. */
export async function cascadeDistrictReferences(districtId: string): Promise<void> {
  const [destinations, cities, attractions, festivals, guides] = await Promise.all([
    Destination.find({ districtId }).select("id heroImage gallery"),
    City.find({ districtId }).select("image"),
    Attraction.find({ districtId }).select("id heroImage gallery"),
    Festival.find({ districtId }).select("image"),
    Guide.find({ districtId }).select("cover authorAvatar")
  ]);

  await Promise.all(destinations.map((d) => cascadeDestinationReferences(d.id)));

  for (const d of destinations) cleanupReplacedImages([d.heroImage, d.gallery], []);
  for (const c of cities) cleanupReplacedImages([c.image], []);
  for (const a of attractions) cleanupReplacedImages([a.heroImage, a.gallery], []);
  for (const f of festivals) cleanupReplacedImages([f.image], []);
  for (const g of guides) cleanupReplacedImages([g.cover, g.authorAvatar], []);

  // Attractions outside this district may still list one of these (now-deleted)
  // attractions as "nearby" — detach those dangling ids too. Same idea for any
  // TripPlan that had one of these attractions in its snapshot.
  const attractionIds = attractions.map((a) => a.id);
  await Promise.all([
    Destination.deleteMany({ districtId }),
    City.deleteMany({ districtId }),
    Attraction.deleteMany({ districtId }),
    Festival.deleteMany({ districtId }),
    Guide.deleteMany({ districtId }),
    attractionIds.length
      ? Attraction.updateMany({ nearbyAttractions: { $in: attractionIds } }, { $pull: { nearbyAttractions: { $in: attractionIds } } })
      : Promise.resolve(),
    attractionIds.length
      ? TripPlan.updateMany({ attractionIds: { $in: attractionIds } }, { $pull: { attractionIds: { $in: attractionIds } } })
      : Promise.resolve(),
    // Treks can span multiple districts — detach this one rather than
    // deleting the whole trek.
    Trek.updateMany({ districtIds: districtId }, { $pull: { districtIds: districtId } })
  ]);
}

/**
 * Removes everything a deleted user owned that would otherwise dangle: their
 * trip plans, bookings, and reviews (with each affected destination's rating
 * recomputed so it doesn't silently keep counting a review that no longer
 * exists), plus the Cloudinary images those trips/reviews owned. Wishlist and
 * refresh tokens live on the User document itself, so they're removed for
 * free by the delete that follows this call. Audit log entries are
 * deliberately left alone — they're a historical record of what happened,
 * not a live reference, and already self-expire after 90 days (see
 * AuditLog.ts) — deleting them here would erase the very trail an admin
 * might want to review after removing an abusive account.
 */
export async function cascadeUserReferences(userId: string): Promise<void> {
  const [trips, reviews] = await Promise.all([
    TripPlan.find({ userId }).select("photos"),
    Review.find({ userId }).select("destinationId photos")
  ]);

  await Promise.all([
    TripPlan.deleteMany({ userId }),
    Booking.deleteMany({ userId }),
    Review.deleteMany({ userId }),
    Notification.deleteMany({ userId })
  ]);

  for (const t of trips) cleanupReplacedImages([t.photos], []);
  for (const r of reviews) cleanupReplacedImages([r.photos], []);

  const destinationIds = Array.from(new Set(reviews.map((r) => r.destinationId)));
  await Promise.all(destinationIds.map((id) => recomputeDestinationRating(id)));
}
