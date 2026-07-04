import { Schema, model, type InferSchemaType } from "mongoose";
import type { IDistrict } from "./types";
import { baseSchemaOptions, coordinatesSchema, imageSchema, emptyImage } from "./shared";

const districtSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    province: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    heroImage: { type: imageSchema, default: emptyImage },
    coordinates: { type: coordinatesSchema, required: true },
    cityCount: { type: Number, default: 0 },
    destinationCount: { type: Number, default: 0 },
    popularFor: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    bestSeason: { type: String, default: "" },
    attractionCount: { type: Number, default: 0 }
  },
  baseSchemaOptions
);

export type DistrictDoc = InferSchemaType<typeof districtSchema>;
export const District = model<IDistrict>("District", districtSchema);
