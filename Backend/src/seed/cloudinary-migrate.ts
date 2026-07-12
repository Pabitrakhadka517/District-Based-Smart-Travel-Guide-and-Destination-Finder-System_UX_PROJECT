/**
 * One-off migration: uploads every Unsplash/pravatar photo currently referenced
 * by the seed data (and a couple of hardcoded UI spots) into this project's own
 * Cloudinary account, so the app no longer depends on external image hosts for
 * its seeded/demo content. Run with: npx tsx src/seed/cloudinary-migrate.ts
 *
 * Idempotent: re-running skips any public_id that already exists in Cloudinary,
 * so a partial/failed run can simply be re-run to pick up where it left off.
 *
 * Output: writes src/seed/cloudinary-map.json — { unsplash, pravatar, placeholders }
 * — consumed by the next step (rewriting images.ts) rather than by the running app.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const DATA_TS = path.join(__dirname, "data.ts");

// Snapshot of the PHOTO map as it exists in images.ts *before* migration —
// decoupled here so this script still has its source list after images.ts
// itself gets rewritten to point at Cloudinary.
const NAMED_PHOTOS: Record<string, string> = {
  himalaya1: "1544735716-392fe2489ffa",
  himalaya2: "1486911278844-a81c5267e227",
  himalaya3: "1469854523086-cc02fe5d8800",
  himalaya4: "1551632811-561732d1e306",
  himalaya5: "1454496522488-7a8e488e8606",
  himalaya6: "1464822759023-fed622ff2c3b",
  himalaya7: "1506905925346-21bda4d32df4",
  himalaya8: "1519681393784-d120267933ba",
  himalaya9: "1458668383970-8ddd3927deed",
  forest1: "1470071459604-3b5ec3a7fe05",
  stupa1: "1605640840605-14ac1855827b",
  stupa2: "1592285896110-8d88b5b3a5d8",
  square1: "1571536802807-30451e3955d8",
  durbarSquareKTM: "1736457093305-5c54384fc49e",
  patanCourtyard: "1699204121879-f7d805d3bc41",
  thamelStreet: "1580321827154-812450ccf214",
  lake1: "1526772662000-3f88f10405ff",
  lake2: "1506905925346-21bda4d32df4",
  jungle1: "1581852017103-68ac65514cf7",
  forest2: "1470071459604-3b5ec3a7fe05",
  hotel1: "1566073771259-6a8506099945",
  hotel2: "1551882547-ff40c63fe5fa",
  lodge1: "1455587734955-081b22074882",
  ebc: "1522774607452-dac2ecc66330",
  kanchenjunga: "1627119703136-3964f14b7325",
  swayambhu: "1665435246383-4103fc803522",
  patanDurbar: "1676299950521-638fa4f0f475",
  bhaktapurSq: "1706188047078-0ba67733fa45",
  chitwan: "1498712067384-01239c6b377c",
  phewa: "1659808909524-5fcad5cd48bf",
  mustangDesert: "1642402734863-15ead077a324",
  manaslu: "1610912335893-b996d1743610",
  annapurna: "1653043506251-05cecdfe9cfd",
  teaHills: "1742106856193-5cc3424ac450",
  teaPickers: "1758390286435-e559ab6d4596",
  tiger: "1714318808656-1aa1639eae15",
  himalayaLake: "1715935257216-fdba0eadd42a",
  sacredLake: "1715935564077-bc4e06915d8c",
  brickTemple: "1760366621342-5c4703099c2c",
  janakpur: "1540996654611-699b763e8a1f",
  nuwakotPalace: "1669557582081-274a568aff4d",
  namobuddha: "1540961286473-8ad1368dc1bd",
  nepalHills: "1599751229070-854ae5c90869",
  tanahun: "1731339987698-a9ddbd4be744",
  tansen: "1529733905113-027ed85d7e33",
  holiColors: "1774160481361-ddc7c7c5f0eb",
  tiharDiya: "1605292356183-a77d0a9c9d1d",
  dashainKite: "1572140857887-c4324122ff1e"
};

const DISTRICT_KEYS = new Set([
  "ebc", "kanchenjunga", "swayambhu", "patanDurbar", "bhaktapurSq", "chitwan",
  "phewa", "mustangDesert", "manaslu", "annapurna", "teaHills", "teaPickers",
  "tiger", "himalayaLake", "sacredLake", "brickTemple", "janakpur",
  "nuwakotPalace", "namobuddha", "nepalHills", "tanahun", "tansen",
  "durbarSquareKTM", "patanCourtyard", "thamelStreet"
]);
const FESTIVAL_KEYS = new Set(["holiColors", "tiharDiya", "dashainKite"]);

function folderForNamedKey(key: string): string {
  if (DISTRICT_KEYS.has(key)) return "nepalyatra/districts";
  if (FESTIVAL_KEYS.has(key)) return "nepalyatra/banners";
  return "nepalyatra/gallery";
}

/** Section name -> Cloudinary folder, mirrors cloudinary.service.ts's FOLDER_MAP. */
const SECTION_FOLDER: Record<string, string> = {
  districts: "nepalyatra/districts",
  cities: "nepalyatra/districts",
  destinations: "nepalyatra/destinations",
  treks: "nepalyatra/treks",
  festivals: "nepalyatra/banners",
  guides: "nepalyatra/guides",
  attractions: "nepalyatra/attractions"
};

interface PlannedUpload {
  publicId: string;
  folder: string;
  sourceUrl: string;
}

function planUnsplashUploads(): Map<string, PlannedUpload> {
  const plan = new Map<string, PlannedUpload>();

  // 1. Named PHOTO palette (images.ts)
  for (const [key, id] of Object.entries(NAMED_PHOTOS)) {
    if (plan.has(id)) continue;
    plan.set(id, {
      publicId: `unsplash_${id}`,
      folder: folderForNamedKey(key),
      sourceUrl: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=85`
    });
  }

  // 2. Inline literal img("...") calls scattered through data.ts, folder assigned
  //    by which top-level export section they physically fall under.
  const text = fs.readFileSync(DATA_TS, "utf8");
  const sectionStarts: { name: string; index: number }[] = [];
  const sectionRe = /^export const (\w+)/gm;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = sectionRe.exec(text))) {
    sectionStarts.push({ name: sMatch[1], index: sMatch.index });
  }
  sectionStarts.sort((a, b) => a.index - b.index);

  function sectionFor(index: number): string {
    let current = "unknown";
    for (const s of sectionStarts) {
      if (s.index <= index) current = s.name;
      else break;
    }
    return current;
  }

  // Matches both `img("id"...)` calls AND bare literal ids passed straight to
  // `gallery("id1", "id2", ...)` — both forms appear in data.ts.
  const idRe = /(?:img|gallery)\([^)]*?"([^")]+)"/g;
  const bareIdRe = /"(\d{13}-[a-f0-9]+)"/g;

  function addId(id: string, index: number): void {
    if (plan.has(id)) return;
    const section = sectionFor(index);
    const folder = SECTION_FOLDER[section] ?? "nepalyatra/gallery";
    plan.set(id, {
      publicId: `unsplash_${id}`,
      folder,
      sourceUrl: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=85`
    });
  }

  let iMatch: RegExpExecArray | null;
  while ((iMatch = idRe.exec(text))) addId(iMatch[1], iMatch.index);

  // Catches every remaining bare "<unsplash-id>" literal anywhere (e.g. the
  // 2nd/3rd argument of a multi-arg gallery(...) call, which idRe's single
  // capture per call would miss).
  let bMatch: RegExpExecArray | null;
  while ((bMatch = bareIdRe.exec(text))) addId(bMatch[1], bMatch.index);

  return plan;
}

function planPravatarUploads(): Map<string, PlannedUpload> {
  const plan = new Map<string, PlannedUpload>();
  const text = fs.readFileSync(DATA_TS, "utf8");
  const numbers = new Set<number>();
  const avRe = /AV\((\d+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = avRe.exec(text))) numbers.add(Number(m[1]));
  // The app's hardcoded default avatar (User/Review models, guide-form, profile page).
  numbers.add(68);
  // The anonymous-reviewer fallback in reviews.controller.ts.
  numbers.add(3);

  for (const n of numbers) {
    plan.set(String(n), {
      publicId: `pravatar_${n}`,
      folder: "nepalyatra/users",
      sourceUrl: `https://i.pravatar.cc/300?img=${n}`
    });
  }
  return plan;
}

interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

async function uploadOne(p: PlannedUpload): Promise<UploadResult> {
  // Cloudinary stores the full "<folder>/<public_id>" as the resource's public_id
  // when both are given to uploader.upload — so the idempotency check (and the
  // returned publicId) must use that same combined form.
  const fullPublicId = `${p.folder}/${p.publicId}`;

  // Idempotent: skip if this asset was already uploaded in a prior run.
  try {
    const existing = await cloudinary.api.resource(fullPublicId, { resource_type: "image" });
    return { url: existing.secure_url, publicId: existing.public_id, width: existing.width, height: existing.height };
  } catch {
    /* not found — upload it below */
  }

  const result = await cloudinary.uploader.upload(p.sourceUrl, {
    folder: p.folder,
    public_id: p.publicId,
    resource_type: "image",
    overwrite: false
  });
  return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height };
}

async function runBatch(entries: [string, PlannedUpload][], concurrency = 8): Promise<Record<string, UploadResult>> {
  const out: Record<string, UploadResult> = {};
  let cursor = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (cursor < entries.length) {
      const idx = cursor++;
      const [key, plan] = entries[idx];
      try {
        out[key] = await uploadOne(plan);
      } catch (err) {
        console.error(`  ✗ FAILED ${key} (${plan.sourceUrl}):`, (err as Error).message ?? err);
      }
      done++;
      if (done % 10 === 0 || done === entries.length) {
        console.log(`  ... ${done}/${entries.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function main(): Promise<void> {
  const unsplashPlan = planUnsplashUploads();
  const pravatarPlan = planPravatarUploads();

  console.log(`Planned uploads: ${unsplashPlan.size} unique Unsplash photos, ${pravatarPlan.size} unique pravatar avatars.`);

  console.log("Uploading Unsplash photos...");
  const unsplashResults = await runBatch([...unsplashPlan.entries()]);

  console.log("Uploading pravatar avatars...");
  const pravatarResults = await runBatch([...pravatarPlan.entries()]);

  console.log("Uploading dedicated placeholder assets...");
  const placeholderPlan: [string, PlannedUpload][] = [
    ["defaultAvatar", { publicId: "default-avatar", folder: "nepalyatra/placeholders", sourceUrl: "https://i.pravatar.cc/300?img=68" }],
    ["defaultImage", { publicId: "default-image", folder: "nepalyatra/placeholders", sourceUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=85" }]
  ];
  const placeholderResults = await runBatch(placeholderPlan);

  const output = {
    unsplash: unsplashResults,
    pravatar: pravatarResults,
    placeholders: placeholderResults
  };

  const outPath = path.join(__dirname, "cloudinary-map.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const unsplashOk = Object.keys(unsplashResults).length;
  const pravatarOk = Object.keys(pravatarResults).length;
  const placeholderOk = Object.keys(placeholderResults).length;

  console.log("\n=== Migration summary ===");
  console.log(`Unsplash photos:  ${unsplashOk}/${unsplashPlan.size} uploaded`);
  console.log(`Pravatar avatars: ${pravatarOk}/${pravatarPlan.size} uploaded`);
  console.log(`Placeholders:     ${placeholderOk}/${placeholderPlan.length} uploaded`);
  console.log(`Map written to:   ${outPath}`);

  if (unsplashOk < unsplashPlan.size || pravatarOk < pravatarPlan.size || placeholderOk < placeholderPlan.length) {
    console.log("\nSome uploads failed — re-run this script to retry the missing ones (it skips already-uploaded assets).");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
