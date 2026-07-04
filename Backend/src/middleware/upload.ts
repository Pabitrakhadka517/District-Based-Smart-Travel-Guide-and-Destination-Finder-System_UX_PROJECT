import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { env } from "../config/env";
import { HttpError } from "./error";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new HttpError(400, "Invalid file type. Only JPEG, PNG, WebP, AVIF and GIF images are allowed."));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  fileFilter
});

export const uploadSingle = upload.single("image");
export const uploadGallery = upload.array("images", 8);
