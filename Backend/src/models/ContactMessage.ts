import { Schema, model, type InferSchemaType } from "mongoose";
import type { IContactMessage } from "./types";
import { baseSchemaOptions } from "./shared";

const contactMessageSchema = new Schema(
  {
    id:      { type: String, required: true, unique: true, index: true },
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true }
  },
  baseSchemaOptions
);

export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessage = model<IContactMessage>("ContactMessage", contactMessageSchema);
