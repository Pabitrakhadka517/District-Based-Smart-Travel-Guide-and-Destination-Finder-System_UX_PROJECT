/**
 * One-off repair: the shared `nepalyatra/placeholders/default-avatar`
 * Cloudinary asset (every new user's avatar until they upload their own —
 * see PLACEHOLDER.avatar in cloudinary.service.ts) was found returning 404,
 * even though its sibling `default-image` placeholder still resolves fine.
 * Re-uploads it from the same source used by the original one-time
 * migration (seed/cloudinary-migrate.ts's placeholderPlan).
 *
 * Idempotent: checks for the existing resource first, so it's a no-op if
 * the asset already exists. Run with: npm run restore-avatar
 */
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDER = "nepalyatra/placeholders";
const PUBLIC_ID = "default-avatar";
const SOURCE_URL = "https://i.pravatar.cc/300?img=68";

async function restoreDefaultAvatar(): Promise<void> {
  const fullPublicId = `${FOLDER}/${PUBLIC_ID}`;

  try {
    const existing = await cloudinary.api.resource(fullPublicId, { resource_type: "image" });
    console.log(`[restore-avatar] Already exists — nothing to do. url=${existing.secure_url}`);
    return;
  } catch {
    /* not found — upload it below */
  }

  const result = await cloudinary.uploader.upload(SOURCE_URL, {
    folder: FOLDER,
    public_id: PUBLIC_ID,
    resource_type: "image",
    overwrite: false,
  });
  console.log(`[restore-avatar] Uploaded. publicId=${result.public_id} url=${result.secure_url}`);
}

if (require.main === module) {
  restoreDefaultAvatar()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[restore-avatar] Failed:", err);
      process.exit(1);
    });
}

export { restoreDefaultAvatar };
