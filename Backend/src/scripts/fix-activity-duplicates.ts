/**
 * One-off repair: many destinations' seed data lists the same real activity
 * twice — once as a curated `attractions` entry (with a description) and
 * again as a plain `activities` tag, phrased slightly differently (e.g.
 * "Jeep Safari" as an attraction vs "Jeep safari" as an activity tag, or
 * "Canoe ride" vs "Canoeing"). The Trip Planner's itinerary auto-suggestion
 * merges both lists into one highlight pool per destination, so a
 * near-duplicate here surfaces as a second, seemingly distinct suggestion on
 * a later day of the same trip — see [[project_chitwan_dedup]] for the
 * original report (Chitwan National Park) that led to this broader audit.
 *
 * This fixes every other destination found to have the same pattern via a
 * manual, per-destination review of each one's full attractions+activities
 * lists (not just automated fuzzy matching, which both under- and
 * over-flagged candidates) — genuinely distinct activities (e.g. "Beach
 * relaxation" alongside "Riverside camping" at the same camp, or multi-day
 * treks whose generic tags legitimately span several distinct real stops)
 * are deliberately left alone.
 *
 * Updates both the live `destinations` collection and this project's own
 * seed source (data.ts) so a future `npm run seed` stays consistent.
 * Idempotent: removing an already-removed string is a no-op.
 * Run with: npx tsx src/scripts/fix-activity-duplicates.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { connectDB, disconnectDB } from "../config/db";
import { Destination } from "../models/Destination";

const DATA_TS = path.join(__dirname, "../seed/data.ts");

const FIXES: Record<string, string[]> = {
  "boudhanath-stupa": ["Rooftop coffee", "Monastery visit"],
  "sarangkot-sunrise": ["Sunrise viewing", "Paragliding"],
  "patan-durbar-square": ["Museum visit"],
  "pathibhara-devi-temple": ["Cable car ride"],
  "halesi-mahadev-pilgrimage-circuit": ["Cave exploration"],
  "dhankuta-hill-town": ["Orchard visits"],
  "panchthar-tea-highlands": ["Tea garden walks"],
  "ilam-tea-gardens": ["Tea garden walks", "Sunrise viewing"],
  "mai-pokhari-lake": ["Bird watching"],
  "kakarbhitta-border-town": ["Market browsing", "Border sightseeing"],
  "jhapa-tea-and-cardamom-countryside": ["Farm visits"],
  "dharan-hill-city": ["Temple visits"],
  "triyuga-river-valley": ["River walks"],
  "dudheswor-nath-pilgrimage-circuit": ["Temple darshan", "Bird watching at ponds"],
  "janaki-mandir-pilgrimage": ["Temple darshan", "Vivaha Panchami festival watching"],
  "gaur-heritage-border-bazaar": ["Bazaar exploration"],
  "kalaiya-simara-gateway-trail": ["Cottage industry visits", "Plane-spotting at Simara"],
  "tinpatan-forest-corridor": ["Forest walking"],
  "bhimeshwor-temple-town": ["Temple visits", "Bazaar shopping"],
  "dhulikhel-himalayan-panorama": ["Sunrise viewing"],
  "waling-orchard-bazaar": ["Orchard visits", "Local market walks"],
  "baglung-kali-gandaki-gorge": ["Gorge viewing", "Suspension bridge crossing"],
  "kushma-bungee-gorge": ["Bungee jumping", "Canyon swinging"],
  "nepalgunj-bazaar-border-culture": ["Bazaar walking", "Temple visits"],
  "jumla-apple-country-chandannath": ["Orchard visits", "Temple pilgrimage"],
  "shaileshwari-temple-dipayal-heritage": ["Temple visits"],
  "tribhumi-pilgrimage-sharda-riverside": ["Temple visits"],
  "mahendranagar-border-town-experience": ["Bazaar exploration", "Riverside strolls"],
  "ugratara-temple-amargadhi-heritage": ["Temple visits", "Fort exploration"],
  "rukumkot-dhorpatan-gateway": ["Ridge trekking", "Wildlife-area approach hiking"],
  "shreenagar-hill-karnali-highway": ["Short hill hiking", "Scenic highway driving"],
  "mangalsen-heritage-walk": ["Sunset viewpoint visits", "Local market browsing"],
  "shuklaphanta-wildlife-safari": ["Machan (watchtower) wildlife viewing"],
  "devghat-pilgrimage-confluence": ["Ashram visits"],
  "tilaurakot-archaeological-site": ["Museum visits"],
  "pancheshwar-sacred-confluence": ["Gorge viewpoint hikes", "Pilgrimage visits"],
  "mahakali-gorge-adventure": ["River rafting", "Cliff-trail hiking"],
  "bulbule-lake-surkhet": ["Paddle boating", "Lakeside walking"],
  "upper-mustang-trek": ["Festival viewing"],
  "trishuli-river-rafting-base": ["White-water rafting", "Riverside camping"],
  "langtang-valley-gateway": ["Glacier viewing"],
  "rasuwagadhi-border-frontier": ["Gorge viewing"],
  "dhading-hilltop-villages": ["Terrace-farm visits", "Sunset viewing"],
  "chure-hills-forest-trail": ["Forest hiking"],
  "besisahar-circuit-gateway": ["River-side walking", "Local market browsing"],
  "ghale-gaun-cultural-village": ["Homestay experience", "Short ridge hikes"],
  "damauli-river-confluence": ["Kayaking"],
  "aandhi-khola-valley": ["Riverside walking"],
  "dhaulagiri-foothills-trail": ["Forest walking"],
  "baglung-kalika-ridge": ["Temple visits", "Sunrise viewing", "Short ridge walks"],
  "resunga-hill-tamghas": ["Ridge hiking"],
  "sandhikharka-village-trails": ["Village walking", "Farm life observation"],
  "parasi-forest-foothills": ["Forest walking"],
  "daunne-danda-viewpoint": ["Short forest walks"],
  "tulsipur-tharu-heritage": ["Traditional dance viewing", "Village walks"],
  "liwang-magar-heritage-trail": ["Village trekking"],
  "musikot-hill-trekking": ["Village trekking"],
  "sani-bheri-village-trail": ["Riverside walking", "Village visits"],
  "karnali-riverbank-village-bardiya": ["Village tours", "River walks"],
  "jajarkot-khalanga-bheri-riverside": ["Village market visits"],
  "kakrebihar-temple-heritage": ["Temple pilgrimage", "Forest walking"],
  "badimalika-pilgrimage-trail": ["Pilgrimage trekking"],
  "dadeldhura-hill-retreat": ["Forest hiking", "Viewpoint visits"],
  "adi-kailash-route-via-darchula": ["Valley trekking"],
};

// The seed source's `destinations` array (data.ts:748-4106) is the only
// place these slugs are guaranteed unique — several also appear as
// Attraction/Guide documents later in the same file with the same slug
// string, so any text-surgery on data.ts must stay scoped to this range.
const DESTINATIONS_ARRAY_START_MARKER = "export const destinations = [";
const DESTINATIONS_ARRAY_END_MARKER = "export const reviews = [";

function patchDataTs(): { slug: string; removed: string[] }[] {
  const text = fs.readFileSync(DATA_TS, "utf8");
  const startIdx = text.indexOf(DESTINATIONS_ARRAY_START_MARKER);
  const endIdx = text.indexOf(DESTINATIONS_ARRAY_END_MARKER);
  if (startIdx === -1 || endIdx === -1) throw new Error("Could not locate destinations array boundaries in data.ts");

  let section = text.slice(startIdx, endIdx);
  const results: { slug: string; removed: string[] }[] = [];

  for (const [slug, toRemove] of Object.entries(FIXES)) {
    const slugAnchor = `slug: "${slug}",`;
    const anchorIdx = section.indexOf(slugAnchor);
    if (anchorIdx === -1) {
      console.warn(`[fix-activity-duplicates] slug "${slug}" not found in data.ts destinations array — skipped.`);
      continue;
    }

    // The `activities: [...]` line always follows the destination's own
    // `slug:`/`attractions:` lines, well within the next couple thousand
    // characters (comfortably before the *next* destination's own slug).
    const searchWindowEnd = Math.min(anchorIdx + 3000, section.length);
    const window = section.slice(anchorIdx, searchWindowEnd);
    const activitiesMatch = /activities: \[([^\]]*)\]/.exec(window);
    if (!activitiesMatch) {
      console.warn(`[fix-activity-duplicates] "activities: [...]" not found near slug "${slug}" — skipped.`);
      continue;
    }

    const originalArrayText = activitiesMatch[0];
    const items = originalArrayText
      .slice("activities: [".length, -1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const removedHere: string[] = [];
    const kept = items.filter((item) => {
      const bare = item.replace(/^"|"$/g, "");
      if (toRemove.includes(bare)) {
        removedHere.push(bare);
        return false;
      }
      return true;
    });

    if (removedHere.length === 0) {
      console.warn(`[fix-activity-duplicates] None of [${toRemove.join(", ")}] found in "${slug}"'s activities — skipped.`);
      continue;
    }

    const newArrayText = `activities: [${kept.join(", ")}]`;
    const absoluteMatchIndex = anchorIdx + activitiesMatch.index;
    section = section.slice(0, absoluteMatchIndex) + newArrayText + section.slice(absoluteMatchIndex + originalArrayText.length);

    results.push({ slug, removed: removedHere });
  }

  const patched = text.slice(0, startIdx) + section + text.slice(endIdx);
  fs.writeFileSync(DATA_TS, patched);
  return results;
}

async function patchLiveDatabase(dataTsResults: { slug: string; removed: string[] }[]): Promise<void> {
  await connectDB();
  for (const { slug, removed } of dataTsResults) {
    const result = await Destination.updateOne({ slug }, { $pull: { activities: { $in: removed } } });
    console.log(`[fix-activity-duplicates] DB: ${slug} — removed [${removed.join(", ")}], matched=${result.matchedCount} modified=${result.modifiedCount}`);
  }
  await disconnectDB();
}

async function main(): Promise<void> {
  const dataTsResults = patchDataTs();
  console.log(`[fix-activity-duplicates] Patched data.ts for ${dataTsResults.length}/${Object.keys(FIXES).length} destinations.`);
  await patchLiveDatabase(dataTsResults);
  console.log("[fix-activity-duplicates] Done.");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[fix-activity-duplicates] Failed:", err);
      process.exit(1);
    });
}
