import { Schema, type SchemaOptions } from "mongoose";

/**
 * Base options applied to every top-level schema so that JSON output matches
 * the frontend's TypeScript interfaces exactly: a string `id` field, and no
 * `_id` / `__v` leakage.
 */
export const baseSchemaOptions: SchemaOptions = {
  versionKey: false,
  id: false, // disable Mongoose's default ObjectId-backed `id` virtual; we use our own string `id`
  toJSON: {
    virtuals: false,
    transform(_doc, ret: Record<string, unknown>) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: false,
    transform(_doc, ret: Record<string, unknown>) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
};

/** Reusable { lat, lng } sub-schema. */
export const coordinatesSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { _id: false }
);

/**
 * Reusable image sub-schema. `publicId` is null for legacy/seeded images that
 * were never uploaded through Cloudinary (so they're never sent to the
 * Cloudinary destroy API by mistake).
 */
export const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    alt: { type: String, default: "" },
    width: { type: Number },
    height: { type: Number },
    blurDataUrl: { type: String, default: "" }
  },
  { _id: false }
);

export const emptyImage = (): { url: string; publicId: null; alt: string } => ({
  url: "",
  publicId: null,
  alt: ""
});
