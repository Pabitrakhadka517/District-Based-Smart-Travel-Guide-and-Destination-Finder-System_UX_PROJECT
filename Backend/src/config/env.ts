import dotenv from "dotenv";
dotenv.config();

const jwtSecret = process.env.JWT_SECRET ?? "";

// Fail fast in every environment if JWT_SECRET is missing or too short — a
// weak/missing secret makes every token in the system forgeable. There is no
// hardcoded fallback: a fallback literal would be public (checked into the
// repo) and forgeable by anyone who reads it, in dev, staging or prod alike.
if (jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET must be set and at least 32 characters long. Set it in your .env file before starting the server."
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
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  corsOrigin,
  emailHost: process.env.EMAIL_HOST ?? "",
  emailPort: Number(process.env.EMAIL_PORT ?? 587),
  emailUser: process.env.EMAIL_USER ?? "",
  emailPass: process.env.EMAIL_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "NepalYatra <noreply@nepalyatra.com>",
  contactEmail: process.env.CONTACT_EMAIL ?? process.env.EMAIL_USER ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5)
};
