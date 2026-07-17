import { randomBytes } from "node:crypto";

/** Generate a collision-safe, opaque, prefixed string id (e.g. "ra1b2c3d4e5f6g7h8"). */
export function genId(prefix: string): string {
  return `${prefix}${randomBytes(8).toString("hex")}`;
}

/** Today's date as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A YYYY-MM-DD date shifted by `days` (negative to go backward), also as YYYY-MM-DD. */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
