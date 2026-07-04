import { Schema, model, type InferSchemaType } from "mongoose";
import type { ICity } from "./types";
import { baseSchemaOptions, coordinatesSchema, imageSchema, emptyImage } from "./shared";

const citySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, index: true },
    districtId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    image: { type: imageSchema, default: emptyImage },
    coordinates: { type: coordinatesSchema, required: true },
    categories: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    destinationCount: { type: Number, default: 0 },
    altitude: { type: Number, default: 0 }
  },
  baseSchemaOptions
);

export type CityDoc = InferSchemaType<typeof citySchema>;
export const City = model<ICity>("City", citySchema);
