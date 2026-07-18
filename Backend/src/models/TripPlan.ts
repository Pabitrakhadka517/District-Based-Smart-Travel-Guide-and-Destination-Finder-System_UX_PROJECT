import { Schema, model, type InferSchemaType } from "mongoose";
import type { ITripPlan } from "./types";
import { baseSchemaOptions, imageSchema } from "./shared";

const activitySchema = new Schema(
  {
    id:            { type: String, required: true },
    time:          { type: String, default: "" },
    // Not required: the itinerary builder creates a blank activity row for
    // the user to fill in, and autosave fires 3s later regardless of whether
    // they've typed a title yet — requiring it here made that a hard save
    // failure (a raw Mongoose validation error surfaced straight to the UI).
    title:         { type: String, default: "" },
    type:          { type: String, enum: ["destination", "attraction", "trek", "custom"], default: "custom" },
    destinationId: { type: String, default: "" },
    notes:         { type: String, default: "" },
    location:      { type: String, default: "" },
    visited:       { type: Boolean, default: false },
    // Marks an auto-generated itinerary suggestion (see itinerary-suggestions.ts
    // on the frontend) — cleared the moment the user edits the activity, so the
    // UI can tell "suggested, not yet reviewed" apart from "the traveller's own".
    suggested:     { type: Boolean, default: false },
  },
  { _id: false }
);

const daySchema = new Schema(
  {
    id:         { type: String, required: true },
    day:        { type: Number, required: true },
    date:       { type: String, default: "" },
    title:      { type: String, default: "" },
    activities: { type: [activitySchema], default: [] },
  },
  { _id: false }
);

const checklistItemSchema = new Schema(
  {
    id:        { type: String, required: true },
    text:      { type: String, required: true },
    completed: { type: Boolean, default: false },
    category:  { type: String, default: "General" },
  },
  { _id: false }
);

const budgetBreakdownSchema = new Schema(
  {
    accommodation:  { type: Number, default: 0 },
    food:           { type: Number, default: 0 },
    transportation: { type: Number, default: 0 },
    activities:     { type: Number, default: 0 },
    other:          { type: Number, default: 0 },
  },
  { _id: false }
);

const tripPlanSchema = new Schema(
  {
    id:              { type: String, required: true, unique: true, index: true },
    userId:          { type: String, required: true, index: true },
    title:           { type: String, required: true },
    travelType:      {
      type: String,
      enum: ["Adventure", "Trekking", "Cultural", "Religious", "Family", "Wildlife", "Luxury", "Budget"],
      default: "Adventure",
    },
    travelers:       { type: Number, default: 1, min: 1 },
    // The single district this trip's guided discovery/recommendations are
    // scoped to. "" for plans created before this field existed, or via the
    // quick-create modal, which doesn't ask for a district.
    districtId:      { type: String, default: "" },
    destinationIds:  { type: [String], default: [] },
    attractionIds:   { type: [String], default: [] },
    trekIds:         { type: [String], default: [] },
    startDate:       { type: String, default: "" },
    endDate:         { type: String, default: "" },
    budget:          { type: Number, default: 0 },
    budgetBreakdown: { type: budgetBreakdownSchema, default: () => ({}) },
    accommodationPreference: {
      type: String,
      enum: ["Budget", "Standard", "Luxury"],
      default: "Standard",
    },
    transportPreference: {
      type: String,
      enum: ["Local Bus", "Private Jeep", "Domestic Flight"],
      default: "Local Bus",
    },
    // Set once a Booking is created from this plan; cleared again if that
    // booking is later cancelled/deleted so the plan becomes bookable again.
    bookingId: { type: String, default: "" },
    status:          {
      type: String,
      enum: ["draft", "planned", "ready", "booked", "ongoing", "completed", "cancelled"],
      default: "draft",
    },
    notes:     { type: String, default: "" },
    itinerary: { type: [daySchema], default: [] },
    checklist: { type: [checklistItemSchema], default: [] },
    photos:    { type: [imageSchema], default: [] },
  },
  baseSchemaOptions
);

tripPlanSchema.index({ userId: 1, startDate: 1 });

export type TripPlanDoc = InferSchemaType<typeof tripPlanSchema>;
export const TripPlan = model<ITripPlan>("TripPlan", tripPlanSchema);
