import type { CloudinaryImage } from "@/types";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/**
 * Builds a bare (untransformed) Cloudinary delivery URL for a known
 * public_id. Callers that want resizing/format transforms should pipe the
 * result through `cld()` below rather than baking a transform in here —
 * `cld()` inserts exactly one transformation segment.
 */
export function cloudinaryUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}.jpg`;
}

/** Shown whenever an image is missing, broken, or fails to load — a
 *  dedicated Cloudinary asset (see `nepalyatra/placeholders/`), not an
 *  external URL. */
export const FALLBACK_IMAGE = cloudinaryUrl("nepalyatra/placeholders/default-image");

/** Shown whenever a user/author/reviewer avatar is missing. */
export const DEFAULT_AVATAR = cloudinaryUrl("nepalyatra/placeholders/default-avatar");

/** Matches the shared placeholder's publicId (see PLACEHOLDER.avatar in the
 *  backend's cloudinary.service.ts) — the one stable identifier for "this is
 *  the default avatar", unlike its `.url`. The backend's Cloudinary SDK bakes
 *  a version segment and delivery query params into that URL (e.g.
 *  `.../v1/nepalyatra/placeholders/default-avatar?_a=...`), which never
 *  string-matches this file's hand-built `DEFAULT_AVATAR` constant even
 *  though both point at the same asset — comparing `.url` against
 *  `DEFAULT_AVATAR` silently never matches. Compare `publicId` instead. */
export const DEFAULT_AVATAR_PUBLIC_ID = "nepalyatra/placeholders/default-avatar";

/** True if `avatar` is "no custom avatar" — either the shared backend
 *  placeholder (real publicId) or the client-side placeholder object used
 *  when a user clears their avatar in a form before saving (publicId: null). */
export function isDefaultAvatar(avatar: { publicId?: string | null } | null | undefined): boolean {
  return !avatar?.publicId || avatar.publicId === DEFAULT_AVATAR_PUBLIC_ID;
}

/** Resolves an (possibly undefined) CloudinaryImage to a renderable URL. */
export function getImageUrl(image: CloudinaryImage | null | undefined, fallback = FALLBACK_IMAGE): string {
  return image?.url?.trim() ? image.url : fallback;
}

export function getImageAlt(image: CloudinaryImage | null | undefined, fallback = ""): string {
  return image?.alt?.trim() ? image.alt : fallback;
}

interface CldTransformOptions {
  width?: number;
  height?: number;
  quality?: "auto" | number;
  crop?: "fill" | "fit" | "scale" | "thumb";
}

/**
 * Inserts Cloudinary transformation parameters (auto format + quality,
 * optional resizing) into a res.cloudinary.com delivery URL. Non-Cloudinary
 * URLs (legacy Unsplash seed data) pass through unchanged.
 */
export function cld(url: string, opts: CldTransformOptions = {}): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;

  const parts = [`f_auto`, `q_${opts.quality ?? "auto"}`];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  if (opts.width || opts.height) parts.push(`c_${opts.crop ?? "fill"}`);

  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}
