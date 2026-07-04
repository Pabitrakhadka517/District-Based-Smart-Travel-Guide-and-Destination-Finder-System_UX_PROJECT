import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, fail } from "../utils/response";
import { HttpError } from "../middleware/error";
import { qs } from "../utils/sanitize";
import { isUploadType, ADMIN_ONLY_TYPES, uploadImage, deleteImage } from "../services/cloudinary.service";

function requireUploadPermission(req: Request): void {
  const type = req.body.type;
  if (!isUploadType(type)) {
    throw new HttpError(400, `type must be one of the supported upload types`);
  }
  if (ADMIN_ONLY_TYPES.has(type) && req.auth?.role !== "admin") {
    throw new HttpError(403, "Admin access required to upload this type of image");
  }
}

/** Wraps a Cloudinary call so its (potentially sensitive) internal error never reaches the client. */
async function withUploadErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[upload] Cloudinary request failed", err);
    throw new HttpError(502, "Image upload service is temporarily unavailable. Please try again shortly.");
  }
}

// POST /api/upload/image  (requireAuth; content types are admin-only, avatar/review open to any user)
export const uploadSingleImage = asyncHandler(async (req: Request, res: Response) => {
  requireUploadPermission(req);
  const file = req.file;
  if (!file) return fail(res, "No image file provided", 400);

  const type = req.body.type;
  const alt = typeof req.body.alt === "string" ? req.body.alt.trim().slice(0, 200) : "";
  const image = await withUploadErrorHandling(() => uploadImage(file.buffer, type, alt));
  ok(res, image, 201);
});

// POST /api/upload/gallery  (requireAuth; same permission rule as above)
export const uploadGalleryImages = asyncHandler(async (req: Request, res: Response) => {
  requireUploadPermission(req);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) return fail(res, "No image files provided", 400);

  const type = req.body.type;
  const alt = typeof req.body.alt === "string" ? req.body.alt.trim().slice(0, 200) : "";
  const images = await withUploadErrorHandling(() => Promise.all(files.map((f) => uploadImage(f.buffer, type, alt))));
  ok(res, images, 201);
});

// DELETE /api/upload/image?publicId=...  (requireAdmin only)
export const deleteUploadedImage = asyncHandler(async (req: Request, res: Response) => {
  const publicId = qs(req.query.publicId);
  if (!publicId) return fail(res, "publicId is required", 400);
  await deleteImage(publicId);
  ok(res, { publicId, deleted: true });
});
