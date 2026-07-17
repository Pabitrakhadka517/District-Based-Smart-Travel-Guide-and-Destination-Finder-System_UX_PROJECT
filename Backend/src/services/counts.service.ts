import { District } from "../models/District";
import { City } from "../models/City";
import { Destination } from "../models/Destination";
import { Attraction } from "../models/Attraction";

/**
 * `District.cityCount/destinationCount/attractionCount` and
 * `City.destinationCount` are stored counters (also directly editable via the
 * admin forms), not derived fields — nothing kept them in sync with the
 * actual child collections until now. Call this after any write that could
 * change what's under a district (creating/updating/deleting a Destination,
 * City or Attraction) so the stored numbers stay accurate everywhere they're
 * read from directly (e.g. the admin districts table), not just on the
 * public district hub page, which already recomputes them live.
 *
 * Known gap: if an admin *reassigns* a Destination/City/Attraction to a
 * different district via edit, only the new district's counts are
 * recomputed here — the old district's counts go stale until its own next
 * write. Reassignment is rare enough that this wasn't worth the extra
 * "diff old vs new parent on every update" plumbing.
 */
export async function syncDistrictCounts(districtId: string | undefined | null): Promise<void> {
  if (!districtId) return;
  const [cityCount, destinationCount, attractionCount] = await Promise.all([
    City.countDocuments({ districtId }),
    Destination.countDocuments({ districtId }),
    Attraction.countDocuments({ districtId })
  ]);
  await District.updateOne({ id: districtId }, { cityCount, destinationCount, attractionCount });
}

export async function syncCityDestinationCount(cityId: string | undefined | null): Promise<void> {
  if (!cityId) return;
  const destinationCount = await Destination.countDocuments({ cityId });
  await City.updateOne({ id: cityId }, { destinationCount });
}
