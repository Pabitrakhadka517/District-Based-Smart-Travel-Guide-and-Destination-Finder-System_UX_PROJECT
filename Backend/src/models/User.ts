import { Schema, model, type InferSchemaType } from "mongoose";
import type { IUser } from "./types";
import { baseSchemaOptions, imageSchema } from "./shared";

const refreshTokenSchema = new Schema(
  {
    token:      { type: String, required: true },
    device:     { type: String, default: "unknown" },
    rememberMe: { type: Boolean, default: false },
    createdAt:  { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    id:       { type: String, required: true, unique: true, index: true },
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    avatar: {
      type: imageSchema,
      default: () => ({ url: "https://i.pravatar.cc/150?img=68", publicId: null, alt: "" })
    },
    role:     { type: String, enum: ["user", "admin"], default: "user" },
    joinedAt:  { type: String, required: true },
    lastLogin: { type: String, default: "" },
    wishlist:  { type: [String], default: [] },
    // Password reset (sparse — only set when a reset is in progress)
    passwordResetToken:  { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    // Refresh tokens stored as SHA-256 hashes — never the raw value
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    // Brute-force protection
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil:     { type: Date, select: false },
    // Account status
    isActive: { type: Boolean, default: true }
  },
  {
    ...baseSchemaOptions,
    toJSON: {
      virtuals: false,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpiry;
        delete ret.refreshTokens;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      }
    }
  }
);

// Sparse index — only exists on documents with an active password reset
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model<IUser>("User", userSchema);
