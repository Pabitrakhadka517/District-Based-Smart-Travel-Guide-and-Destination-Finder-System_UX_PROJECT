import { Schema, model } from "mongoose";

/**
 * Records every refresh-token hash the moment it's rotated away (replaced by
 * a newer one). `refresh()` normally looks the presented token up directly in
 * `User.refreshTokens`, but rotation overwrites that array entry — so a
 * replayed, already-rotated (stolen) token would otherwise just look like any
 * other invalid token, with no way to tell *whose* session was compromised.
 * Checking this collection on a lookup miss recovers that: if the hash shows
 * up here, it's a genuine reuse of a rotated-away token, not a bogus one, and
 * `refresh()` responds by revoking every session for that user.
 */
const usedRefreshTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true }, // SHA-256 hash of the rotated-away token
    userId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// Matches the longest a refresh token can legitimately live (30 days, "remember me")
// — no point retaining reuse-detection history past the point the token would
// have expired on its own anyway.
usedRefreshTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const UsedRefreshToken = model("UsedRefreshToken", usedRefreshTokenSchema);
