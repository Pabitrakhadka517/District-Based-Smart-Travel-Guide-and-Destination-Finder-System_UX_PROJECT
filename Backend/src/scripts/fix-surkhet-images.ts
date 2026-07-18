/**
 * One-off repair: 5 Surkhet (Karnali) destinations/attractions had heroImages
 * that didn't match their real subject at all — an inference from the shared
 * NAMED_PHOTOS pool (see cloudinary-migrate.ts) confirmed by actually viewing
 * the downloaded images: "Bulbule Lake" had no lake, "Kakrebihar Temple" had
 * no temple, "Chhinchu Karnali Riverside" had no river, "Birendranagar City
 * Viewpoint" was an unrelated Everest-region stupa photo, and "Kakre Bihar"
 * (ancient temple ruins) was a photo of Varanasi, India.
 *
 * Uploads 5 newly-sourced, content-matched Unsplash photos to this project's
 * Cloudinary account (same convention as cloudinary-migrate.ts's named-photo
 * pool: nepalyatra/gallery/unsplash_<id>), then:
 *   1. patches cloudinary-map.json so data.ts's img() keeps resolving these
 *      ids on a future `npm run seed`,
 *   2. patches the live Destination/Attraction documents directly so the
 *      fix is visible immediately without a full reseed.
 *
 * Idempotent: re-running skips any Cloudinary asset that already exists and
 * simply re-applies the same DB updates.
 * Run with: npx tsx src/scripts/fix-surkhet-images.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { connectDB, disconnectDB } from "../config/db";
import { Destination } from "../models/Destination";
import { Attraction } from "../models/Attraction";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const MAP_PATH = path.join(__dirname, "../seed/cloudinary-map.json");
const FOLDER = "nepalyatra/gallery";

// New replacement photo ids (verified by visual inspection against each
// place's actual description before picking).
const REPLACEMENTS = {
  bulbuleLake: "1753129557585-1121b904bca4", // calm park lake with a boat, trees
  kakrebiharTemple: "1753155438861-97e8d0025742", // moss-covered stone temple ruins in forest
  chhinchuRiver: "1684230715200-40f32e068bf2", // gravel-banked river with hills/mountains
  birendranagarView: "1711553186815-8fbc95d02155", // hill town spread across a valley, viewed from above
  kakreBiharRuins: "1771259664184-0328a372b5fd", // ancient stone wall ruins on a grassy hillside above a valley town
} as const;

interface MappedAsset {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

async function uploadOne(id: string): Promise<MappedAsset> {
  const publicId = `unsplash_${id}`;
  const fullPublicId = `${FOLDER}/${publicId}`;

  try {
    const existing = await cloudinary.api.resource(fullPublicId, { resource_type: "image" });
    console.log(`[fix-surkhet-images] ${id} already migrated.`);
    return { url: existing.secure_url, publicId: fullPublicId, width: existing.width, height: existing.height };
  } catch {
    /* not found — upload it below */
  }

  const result = await cloudinary.uploader.upload(
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=85`,
    { folder: FOLDER, public_id: publicId, resource_type: "image", overwrite: false }
  );
  console.log(`[fix-surkhet-images] Uploaded ${id} -> ${result.public_id}`);
  return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height };
}

function toImage(asset: MappedAsset, alt: string) {
  return { url: asset.url, publicId: asset.publicId, alt };
}

async function fixSurkhetImages(): Promise<void> {
  const assets: Record<keyof typeof REPLACEMENTS, MappedAsset> = {} as never;
  for (const [key, id] of Object.entries(REPLACEMENTS)) {
    assets[key as keyof typeof REPLACEMENTS] = await uploadOne(id);
  }

  // 1. Patch cloudinary-map.json so data.ts's img() resolves these ids too.
  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  for (const id of Object.values(REPLACEMENTS)) {
    const asset = assets[(Object.keys(REPLACEMENTS) as (keyof typeof REPLACEMENTS)[]).find((k) => REPLACEMENTS[k] === id)!];
    map.unsplash[id] = { url: asset.url, publicId: asset.publicId, width: asset.width, height: asset.height };
  }
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
  console.log("[fix-surkhet-images] cloudinary-map.json updated.");

  // 2. Patch the live documents.
  await connectDB();

  await Destination.updateOne(
    { slug: "bulbule-lake-surkhet" },
    { $set: { heroImage: toImage(assets.bulbuleLake, "Bulbule Lake"), gallery: [toImage(assets.bulbuleLake, "Bulbule Lake")] } }
  );
  await Destination.updateOne(
    { slug: "kakrebihar-temple-heritage" },
    { $set: { heroImage: toImage(assets.kakrebiharTemple, "Kakrebihar Temple Heritage Site"), gallery: [toImage(assets.kakrebiharTemple, "Kakrebihar Temple Heritage Site")] } }
  );
  await Attraction.updateOne(
    { slug: "bulbule-lake-attraction" },
    { $set: { heroImage: toImage(assets.bulbuleLake, "Bulbule Lake"), gallery: [toImage(assets.bulbuleLake, "Bulbule Lake")] } }
  );
  await Attraction.updateOne(
    { slug: "kakrebihar-temple" },
    { $set: { heroImage: toImage(assets.kakrebiharTemple, "Kakrebihar Temple"), gallery: [toImage(assets.kakrebiharTemple, "Kakrebihar Temple")] } }
  );
  await Attraction.updateOne(
    { slug: "chhinchu-karnali-riverside" },
    { $set: { heroImage: toImage(assets.chhinchuRiver, "Chhinchu Karnali Riverside"), gallery: [toImage(assets.chhinchuRiver, "Chhinchu Karnali Riverside")] } }
  );
  await Attraction.updateOne(
    { slug: "birendranagar-city-viewpoint" },
    { $set: { heroImage: toImage(assets.birendranagarView, "Birendranagar City Viewpoint"), gallery: [toImage(assets.birendranagarView, "Birendranagar City Viewpoint")] } }
  );
  await Attraction.updateOne(
    { slug: "kakre-bihar-surkhet" },
    { $set: { heroImage: toImage(assets.kakreBiharRuins, "Kakre Bihar"), gallery: [toImage(assets.kakreBiharRuins, "Kakre Bihar")] } }
  );

  console.log("[fix-surkhet-images] Live Surkhet destination/attraction documents updated.");
  await disconnectDB();
}

if (require.main === module) {
  fixSurkhetImages()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[fix-surkhet-images] Failed:", err);
      process.exit(1);
    });
}

export { fixSurkhetImages };
