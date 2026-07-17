import type { Response } from "express";
import mongoose from "mongoose";

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    !(v instanceof mongoose.Document)
  );
}

/**
 * `.lean()` queries return plain JS objects, which bypass each schema's
 * `toJSON` transform (see models/shared.ts) that normally strips `_id`/`__v`
 * — that transform only runs when something calls `.toJSON()` on an actual
 * Mongoose Document. This walks a response payload and removes `_id`/`__v`
 * from every plain object it finds, at any nesting depth, so a lean() result
 * comes out with the exact same shape as a hydrated one. Real Document
 * instances are left untouched here — they still self-serialize correctly
 * (with `_id`/`__v` already stripped) when `res.json()` calls `JSON.stringify`,
 * which invokes each Document's own `.toJSON()`.
 */
function stripMongoInternals<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripMongoInternals(v)) as unknown as T;
  }
  if (isPlainRecord(value)) {
    const clone: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (key === "_id" || key === "__v") continue;
      clone[key] = stripMongoInternals(v);
    }
    return clone as unknown as T;
  }
  return value;
}

/**
 * Standard success envelope — matches the frontend's apiGet/apiPost expectations:
 *   { success: true, data: <payload> }
 */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data: stripMongoInternals(data) });
}

/**
 * Standard error envelope:
 *   { success: false, error: <message> }
 */
export function fail(res: Response, error: string, status = 400): Response {
  return res.status(status).json({ success: false, error });
}

/**
 * Paginated success envelope — `data` is still the plain array (so every
 * existing caller that just reads `.data` keeps working unchanged), with
 * `total`/`page`/`limit` added alongside it for callers that want real
 * pagination (admin tables, search) instead of a silent hard cap.
 *   { success: true, data: <T[]>, total, page, limit }
 */
export function okPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number
): Response {
  return res.status(200).json({ success: true, data: stripMongoInternals(items), total, page, limit });
}
