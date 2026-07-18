import { apiUpload, apiDelete, getApiBase } from "./api-client";
import type { CloudinaryImage } from "@/types";

export type UploadType =
  | "district"
  | "city"
  | "destination-cover"
  | "destination-gallery"
  | "attraction-cover"
  | "attraction-gallery"
  | "trek-cover"
  | "trek-gallery"
  | "festival"
  | "guide-cover"
  | "guide-avatar"
  | "avatar"
  | "review"
  | "planner";

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPG, JPEG, PNG and WEBP images are allowed.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Image must be smaller than ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

/**
 * Uploads a single file via XMLHttpRequest so callers can show real upload
 * progress (fetch() has no reliable upload-progress event).
 */
function uploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress?: (pct: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiBase()}${path}`);
    // Auth is via the httpOnly access-token cookie, sent automatically because
    // of withCredentials — same as every other request in this app.
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve(json.data as T);
        } else {
          reject(new Error(json.error ?? "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.send(formData);
  });
}

export const uploadService = {
  uploadImage: (file: File, type: UploadType, alt = ""): Promise<CloudinaryImage> => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", type);
    if (alt) formData.append("alt", alt);
    return apiUpload<CloudinaryImage>("/upload/image", formData);
  },

  uploadGallery: (files: File[], type: UploadType, alt = ""): Promise<CloudinaryImage[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    formData.append("type", type);
    if (alt) formData.append("alt", alt);
    return apiUpload<CloudinaryImage[]>("/upload/gallery", formData);
  },

  /** Same as uploadImage, but reports upload progress (0-100) via XHR. */
  uploadImageWithProgress: (
    file: File,
    type: UploadType,
    onProgress?: (pct: number) => void,
    alt = ""
  ): Promise<CloudinaryImage> => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", type);
    if (alt) formData.append("alt", alt);
    return uploadWithProgress<CloudinaryImage>("/upload/image", formData, onProgress);
  },

  /** Admin only — deletes an asset from Cloudinary by its publicId. No-op-safe for null publicIds. */
  deleteImage: (publicId: string | null | undefined): Promise<void> => {
    if (!publicId) return Promise.resolve();
    return apiDelete<void>(`/upload/image?publicId=${encodeURIComponent(publicId)}`).catch(() => undefined);
  },

  /** Deletes any image in `after` that wasn't already part of `before`. Used
   *  when an admin form is cancelled: ImageUploader/GalleryUploader upload to
   *  Cloudinary immediately on selection (so previews work without an extra
   *  save round-trip), but if the form is dismissed instead of saved, those
   *  freshly-uploaded replacements would otherwise never get cleaned up. */
  discardUnsavedImages: (
    before: Array<CloudinaryImage | CloudinaryImage[] | null | undefined>,
    after: Array<CloudinaryImage | CloudinaryImage[] | null | undefined>
  ): void => {
    const flatten = (list: typeof before) => {
      const ids = new Set<string>();
      for (const item of list) {
        if (!item) continue;
        for (const img of Array.isArray(item) ? item : [item]) {
          if (img?.publicId) ids.add(img.publicId);
        }
      }
      return ids;
    };
    const beforeIds = flatten(before);
    for (const id of flatten(after)) {
      if (!beforeIds.has(id)) void uploadService.deleteImage(id);
    }
  }
};
