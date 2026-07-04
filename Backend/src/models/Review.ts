import { Schema, model, type InferSchemaType } from "mongoose";
import type { IReview } from "./types";
import { baseSchemaOptions, imageSchema } from "./shared";

const reviewSchema = new Schema(
  {
    id:            { type: String, required: true, unique: true, index: true },
    destinationId: { type: String, required: true, index: true },
    // userId links the review to the authenticated user who submitted it.
    // Sparse so legacy seeded reviews without this field are unaffected.
    userId:  { type: String, index: true, sparse: true },
    author:  { type: String, default: "Anonymous" },
    avatar:  {
      type: imageSchema,
      default: () => ({ url: "https://i.pravatar.cc/150?img=3", publicId: null, alt: "Anonymous traveler" })
    },
    rating:  { type: Number, default: 5, min: 1, max: 5 },
    title:   { type: String, default: "" },
    body:    { type: String, default: "" },
    date:    { type: String, required: true },
    helpful:          { type: Number, default: 0 },
    status:           { type: String, enum: ["approved", "pending", "rejected"], default: "pending", index: true },
    photos:           { type: [imageSchema], default: [] },
    verifiedTraveler: { type: Boolean, default: false }
  },
  baseSchemaOptions
);

// Compound index for the most common query: approved reviews for a destination
reviewSchema.index({ destinationId: 1, status: 1 });

// Prevent a single user from submitting multiple reviews for the same destination.
// partialFilterExpression ensures the constraint only applies when userId is non-null,
// so seeded reviews without a userId can coexist for the same destination.
reviewSchema.index(
  { destinationId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
);

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const Review = model<IReview>("Review", reviewSchema);
