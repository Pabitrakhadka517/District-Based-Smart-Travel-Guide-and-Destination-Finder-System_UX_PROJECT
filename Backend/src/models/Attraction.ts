import { Schema, model, type InferSchemaType } from "mongoose";
import { baseSchemaOptions, coordinatesSchema, imageSchema, emptyImage } from "./shared";

const entryFeeSchema = new Schema(
  {
    nepali: { type: Number, default: 0 },
    saarc: { type: Number, default: 0 },
    foreigner: { type: Number, default: 0 },
    currency: { type: String, default: "NPR" }
  },
  { _id: false }
);

const nearbyHotelSchema = new Schema(
  { name: { type: String }, stars: { type: Number }, priceRange: { type: String } },
  { _id: false }
);

const nearbyRestaurantSchema = new Schema(
  { name: { type: String }, cuisine: { type: String }, priceRange: { type: String } },
  { _id: false }
);

const attractionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    districtId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    history: { type: String, default: "" },
    heroImage: { type: imageSchema, default: emptyImage },
    gallery: { type: [imageSchema], default: [] },
    coordinates: { type: coordinatesSchema, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    openingHours: { type: String, default: "" },
    entryFee: { type: entryFeeSchema, default: () => ({}) },
    bestTimeToVisit: { type: [String], default: [] },
    activities: { type: [String], default: [] },
    localFoods: { type: [String], default: [] },
    travelTips: { type: [String], default: [] },
    nearbyAttractions: { type: [String], default: [] },
    nearbyHotels: { type: [nearbyHotelSchema], default: [] },
    nearbyRestaurants: { type: [nearbyRestaurantSchema], default: [] },
    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true }
  },
  baseSchemaOptions
);

export type AttractionDoc = InferSchemaType<typeof attractionSchema>;
export const Attraction = model("Attraction", attractionSchema);
