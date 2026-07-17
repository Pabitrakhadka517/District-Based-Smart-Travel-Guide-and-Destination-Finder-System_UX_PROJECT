import { Review } from "../models/Review";
import { Booking } from "../models/Booking";
import { User } from "../models/User";
import { TripPlan } from "../models/TripPlan";
import { City } from "../models/City";
import { Attraction } from "../models/Attraction";
import { Festival } from "../models/Festival";
import { Guide } from "../models/Guide";
import { Trek } from "../models/Trek";
import { Destination } from "../models/Destination";
import { cleanupReplacedImages } from "./cloudinary.service";

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
  await Promise.all([
    Review.deleteMany({ destinationId }),
    Booking.deleteMany({ destinationId }),
    User.updateMany({ wishlist: destinationId }, { $pull: { wishlist: destinationId } }),
    TripPlan.updateMany(
      { destinationIds: destinationId },
      { $pull: { destinationIds: destinationId } }
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
  await Attraction.updateMany(
    { nearbyAttractions: attractionId },
    { $pull: { nearbyAttractions: attractionId } }
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
  // attractions as "nearby" — detach those dangling ids too.
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
    // Treks can span multiple districts — detach this one rather than
    // deleting the whole trek.
    Trek.updateMany({ districtIds: districtId }, { $pull: { districtIds: districtId } })
  ]);
}
