import type { Request, Response, NextFunction } from "express";
import { Error as MongooseError } from "mongoose";
import { MongoServerError } from "mongodb";
import multer from "multer";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: "Route not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Intentional HTTP errors (thrown by controllers)
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }

  // Multer upload errors (file too large, too many files, unexpected field, etc.)
  if (err instanceof multer.MulterError) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  // Mongoose document validation failed (missing required field, enum mismatch, etc.)
  if (err instanceof MongooseError.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    res.status(400).json({ success: false, error: "Validation failed", errors });
    return;
  }

  // MongoDB duplicate key (unique index violation)
  if (err instanceof MongoServerError && err.code === 11000) {
    const field = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0] ?? "field";
    res.status(409).json({ success: false, error: `${field} already exists` });
    return;
  }

  // Unexpected server errors — log them, never leak internals
  console.error("[error]", err);
  res.status(500).json({ success: false, error: "Internal server error" });
}
