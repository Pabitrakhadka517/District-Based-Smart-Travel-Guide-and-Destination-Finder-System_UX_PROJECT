import { Schema, model, type InferSchemaType } from "mongoose";
import type { ITravelAlert } from "./types";
import { baseSchemaOptions } from "./shared";

const travelAlertSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    level: { type: String, enum: ["Info", "Advisory", "Warning"], required: true },
    text: { type: String, required: true },
    districtId: { type: String, index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  baseSchemaOptions
);

export type TravelAlertDoc = InferSchemaType<typeof travelAlertSchema>;
export const TravelAlert = model<ITravelAlert>("TravelAlert", travelAlertSchema);
