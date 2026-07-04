import { Schema, model, type InferSchemaType } from "mongoose";
import type { IPackingChecklist } from "./types";
import { baseSchemaOptions } from "./shared";

const packingChecklistSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, unique: true, index: true },
    items: { type: [String], default: [] }
  },
  baseSchemaOptions
);

export type PackingChecklistDoc = InferSchemaType<typeof packingChecklistSchema>;
export const PackingChecklist = model<IPackingChecklist>("PackingChecklist", packingChecklistSchema);
