import dotenv from "dotenv";
dotenv.config();

const jwtSecret = process.env.JWT_SECRET ?? "";

// Fail fast in production if JWT_SECRET is missing or too short.
// A weak/missing secret makes every token in the system forgeable.
if (process.env.NODE_ENV === "production" && jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET must be set and at least 32 characters long before starting in production."
  );
}

const corsOrigin = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Prevent accidental wildcard CORS if the env var is accidentally empty
if (corsOrigin.length === 0) {
  corsOrigin.push("http://localhost:3000");
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/nepalyatra",
  // Safe dev-only fallback — production check above will reject this
  jwtSecret: jwtSecret || "dev_only_secret_at_least_32_chars_long!!",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  corsOrigin,
  emailHost: process.env.EMAIL_HOST ?? "",
  emailPort: Number(process.env.EMAIL_PORT ?? 587),
  emailUser: process.env.EMAIL_USER ?? "",
  emailPass: process.env.EMAIL_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "NepalYatra <noreply@nepalyatra.com>",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5)
};
