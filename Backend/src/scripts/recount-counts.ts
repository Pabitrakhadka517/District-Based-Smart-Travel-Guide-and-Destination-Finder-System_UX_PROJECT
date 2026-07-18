import { connectDB, disconnectDB } from "../config/db";
import { District } from "../models/District";
import { City } from "../models/City";
import { syncDistrictCounts, syncCityDestinationCount } from "../services/counts.service";

/**
 * Recomputes every District's cityCount/destinationCount/attractionCount and
 * every City's destinationCount from the actual child collections.
 *
 * These are stored counters, not derived fields (see counts.service.ts) —
 * normal CRUD keeps them in sync, but the one documented gap is reassigning
 * a Destination/City/Attraction to a *different* district via edit, which
 * only resyncs the new parent, not the old one. Run this after bulk data
 * changes (e.g. direct DB edits, a partial reseed) or if the admin districts
 * table ever looks off, to correct any drift in one pass.
 */
async function recountCounts(): Promise<void> {
  const [districts, cities] = await Promise.all([
    District.find().select("id slug").lean(),
    City.find().select("id").lean(),
  ]);

  console.log(`[recount] Resyncing ${districts.length} districts and ${cities.length} cities...`);

  let fixed = 0;
  for (const d of districts) {
    const before = await District.findOne({ id: d.id }).select("cityCount destinationCount attractionCount").lean();
    await syncDistrictCounts(d.id);
    const after = await District.findOne({ id: d.id }).select("cityCount destinationCount attractionCount").lean();
    if (before && after && (
      before.cityCount !== after.cityCount ||
      before.destinationCount !== after.destinationCount ||
      before.attractionCount !== after.attractionCount
    )) {
      fixed++;
      console.log(`[recount] Fixed ${d.slug}: cities ${before.cityCount}->${after.cityCount}, destinations ${before.destinationCount}->${after.destinationCount}, attractions ${before.attractionCount}->${after.attractionCount}`);
    }
  }

  await Promise.all(cities.map((c) => syncCityDestinationCount(c.id)));

  console.log(`[recount] Done. ${fixed} district(s) had stale counts corrected.`);
}

if (require.main === module) {
  (async () => {
    await connectDB();
    await recountCounts();
    await disconnectDB();
    process.exit(0);
  })().catch((err) => {
    console.error("[recount] Failed:", err);
    process.exit(1);
  });
}

export { recountCounts };
