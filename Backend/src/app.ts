import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import mongoose from "mongoose";
import { env } from "./config/env";
import { optionalAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import apiRouter from "./routes";
import { openapiSpec } from "./docs/openapi";

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // Never fall back to `origin: true` (allow all) — always use the explicit list
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );

  // Compress all JSON/text responses
  app.use(compression());

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  // Attach req.auth when a valid Bearer token is present
  app.use(optionalAuth);

  // Health check — verifies DB connectivity so orchestrators know real status
  app.get("/health", (_req: Request, res: Response) => {
    const dbState = mongoose.connection.readyState; // 1 = connected
    if (dbState !== 1) {
      return res
        .status(503)
        .json({ success: false, data: { status: "degraded", db: "disconnected", uptime: process.uptime() } });
    }
    res.json({ success: true, data: { status: "ok", db: "connected", uptime: process.uptime() } });
  });

  const swaggerUiOptions = {
    customSiteTitle: "NepaYatra API Docs",
    customCss: ".swagger-ui .topbar { background-color: #1a365d; }",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  };

  app.get("/api/openapi.json", (_req: Request, res: Response) => {
    res.json(openapiSpec);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec as object, swaggerUiOptions));
  app.use("/docs",     swaggerUi.serve, swaggerUi.setup(openapiSpec as object, swaggerUiOptions));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
