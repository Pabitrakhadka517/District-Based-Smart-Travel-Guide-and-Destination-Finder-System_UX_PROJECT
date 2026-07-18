import { Schema, model, type InferSchemaType } from "mongoose";
import type { INotification } from "./types";
import { baseSchemaOptions } from "./shared";

const notificationSchema = new Schema(
  {
    id:      { type: String, required: true, unique: true, index: true },
    userId:  { type: String, required: true, index: true },
    type:    {
      type: String,
      enum: ["booking_confirmed", "booking_cancelled", "trip_ready", "booking_pending", "review_pending"],
      required: true
    },
    message: { type: String, required: true },
    link:    { type: String, default: "" },
    read:    { type: Boolean, default: false, index: true }
  },
  baseSchemaOptions
);

// Most common query: a user's own notifications, newest first.
notificationSchema.index({ userId: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const Notification = model<INotification>("Notification", notificationSchema);
