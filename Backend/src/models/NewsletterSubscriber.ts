import { Schema, model, type InferSchemaType } from "mongoose";
import type { INewsletterSubscriber } from "./types";
import { baseSchemaOptions } from "./shared";

const newsletterSubscriberSchema = new Schema(
  {
    id:    { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true }
  },
  baseSchemaOptions
);

export type NewsletterSubscriberDoc = InferSchemaType<typeof newsletterSubscriberSchema>;
export const NewsletterSubscriber = model<INewsletterSubscriber>("NewsletterSubscriber", newsletterSubscriberSchema);
