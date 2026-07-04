/**
 * Escapes all regex special characters so user-supplied strings are safe
 * to pass to MongoDB's { $regex } operator. Prevents ReDoS attacks.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns only the whitelisted keys from an object, dropping everything else.
 * Use this on req.body before passing to Mongoose to prevent operator injection.
 */
export function pick(
  obj: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Safely casts a query param to string.
 * Returns undefined for objects/arrays — prevents { $ne: "..." } injection
 * through Express's qs query parser.
 */
export function qs(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

export interface SanitizedImage {
  url: string;
  publicId: string | null;
  alt: string;
  width?: number;
  height?: number;
  blurDataUrl?: string;
}

/**
 * Whitelists an image object's keys before it's saved to Mongo, so a client
 * can never smuggle extra/prototype-polluting keys through a nested field.
 * Returns null if `input` isn't a plausible image object.
 */
export function sanitizeImage(input: unknown): SanitizedImage | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  if (typeof obj.url !== "string" || !obj.url.trim()) return null;

  const image: SanitizedImage = {
    url: obj.url.trim(),
    publicId: typeof obj.publicId === "string" ? obj.publicId : null,
    alt: typeof obj.alt === "string" ? obj.alt.slice(0, 200) : ""
  };
  if (typeof obj.width === "number") image.width = obj.width;
  if (typeof obj.height === "number") image.height = obj.height;
  if (typeof obj.blurDataUrl === "string") image.blurDataUrl = obj.blurDataUrl.slice(0, 20000);
  return image;
}

/** Same as sanitizeImage but for an array, capped at `max` entries. */
export function sanitizeGallery(input: unknown, max = 20): SanitizedImage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => sanitizeImage(item))
    .filter((img): img is SanitizedImage => img !== null)
    .slice(0, max);
}
