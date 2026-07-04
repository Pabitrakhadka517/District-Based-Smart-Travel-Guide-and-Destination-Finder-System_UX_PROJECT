import { Schema, model, type InferSchemaType } from "mongoose";
import type { IDestination } from "./types";
import { baseSchemaOptions, coordinatesSchema, imageSchema, emptyImage } from "./shared";

const attractionSchema = new Schema(
  { name: { type: String, required: true }, description: { type: String, default: "" } },
  { _id: false }
);

const restaurantSchema = new Schema(
  {
    name: { type: String, required: true },
    cuisine: { type: String, default: "" },
    priceRange: { type: String, default: "" }
  },
  { _id: false }
);

const budgetSchema = new Schema(
  {
    budget: { type: Number, required: true },
    midRange: { type: Number, required: true },
    luxury: { type: Number, required: true },
    currency: { type: String, default: "NPR" }
  },
  { _id: false }
);

const destinationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    cityId: { type: String, required: true, index: true },
    districtId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    heroImage: { type: imageSchema, default: emptyImage },
    gallery: { type: [imageSchema], default: [] },
    coordinates: { type: coordinatesSchema, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    bestTimeToVisit: { type: [String], default: [] },
    budget: { type: budgetSchema, required: true },
    attractions: { type: [attractionSchema], default: [] },
    activities: { type: [String], default: [] },
    restaurants: { type: [restaurantSchema], default: [] },
    localFoods: { type: [String], default: [] },
    travelTips: { type: [String], default: [] },
    pros: { type: [String], default: [] },
    cons: { type: [String], default: [] },
    nearby: { type: [String], default: [] },
    featured:   { type: Boolean, default: false, index: true },
    trending:   { type: Boolean, default: false, index: true },
    difficulty:          { type: String, enum: ["Easy", "Moderate", "Challenging", "Strenuous"] },
    recommendedDuration: { type: String, default: "" }
  },
  baseSchemaOptions
);

destinationSchema.index({ name: "text", tagline: "text", description: "text" });

export type DestinationDoc = InferSchemaType<typeof destinationSchema>;
export const Destination = model<IDestination>("Destination", destinationSchema);
