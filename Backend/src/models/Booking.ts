import { Schema, model, type InferSchemaType } from "mongoose";
import type { IBooking } from "./types";
import { baseSchemaOptions } from "./shared";

const bookingSchema = new Schema(
  {
    id:            { type: String, required: true, unique: true, index: true },
    userId:        { type: String, required: true, index: true },
    // A booking must always come from a trip plan — this is the source of
    // truth linking the two documents (see TripPlan.bookingId for the reverse
    // link). Indexed below via the partial-unique index, not here, to avoid
    // declaring the same index twice.
    tripPlanId:    { type: String, required: true },
    destinationId: { type: String, required: true, index: true },
    // Full snapshot of the plan's destinations at booking time, in case it
    // covers more than one stop — destinationId above stays the primary/first
    // one so every existing single-destination display keeps working.
    destinationIds: { type: [String], default: [] },
    travelDate:    { type: String, required: true },
    returnDate:    { type: String, default: "" },
    travelers:     { type: Number, default: 1, min: 1 },
    budget:        { type: Number, default: 0, min: 0 },
    accommodationType: {
      type: String,
      enum: ["Budget", "Standard", "Luxury"],
      default: "Standard"
    },
    transportPreference: {
      type: String,
      enum: ["Local Bus", "Private Jeep", "Domestic Flight"],
      default: "Local Bus"
    },
    estimatedCost: { type: Number, default: 0 },
    status:        { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    notes:         { type: String, default: "" },

    // Traveller information — required
    fullName:               { type: String, required: true },
    phone:                  { type: String, required: true },
    emergencyContactName:   { type: String, required: true },
    emergencyContactNumber: { type: String, required: true },
    // Automatic — copied from the logged-in user at creation, never user-editable.
    email:                  { type: String, required: true },
    // Traveller information — optional
    nationality:          { type: String, default: "" },
    passportNumber:        { type: String, default: "" },
    medicalInfo:           { type: String, default: "" },
    specialRequirements:   { type: String, default: "" }
    // createdAt / updatedAt come from baseSchemaOptions' `timestamps: true`.
  },
  baseSchemaOptions
);

bookingSchema.index({ userId: 1, travelDate: 1 });

// Prevent a double form-submit (or resubmit) from creating two identical active
// bookings. Scoped to non-cancelled bookings so a user can freely rebook the
// same destination/date after cancelling.
bookingSchema.index(
  { userId: 1, destinationId: 1, travelDate: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } }
);

// A trip plan can have at most one active booking — the controller already
// checks this via TripPlan.bookingId, this index is a defense-in-depth guard
// against a race between two concurrent booking requests for the same plan.
bookingSchema.index(
  { tripPlanId: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } }
);

export type BookingDoc = InferSchemaType<typeof bookingSchema>;
export const Booking = model<IBooking>("Booking", bookingSchema);
