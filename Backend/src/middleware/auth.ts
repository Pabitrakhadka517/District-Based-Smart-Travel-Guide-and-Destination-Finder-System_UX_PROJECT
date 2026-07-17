import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "./error";

export interface AuthPayload {
  sub: string; // user.id
  role: "user" | "admin";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// The browser frontend relies on the httpOnly cookie (never touches the token
// via JS, so it can't be exfiltrated through an XSS bug); the Authorization
// header stays supported as a fallback so non-browser API clients (Swagger
// UI's "Authorize" dialog, curl, mobile clients) keep working exactly as before.
export const ACCESS_COOKIE = "nepalyatra_at";

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookieToken = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (cookieToken) return cookieToken;
  return null;
}

/** Attaches req.auth if a valid Bearer token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (token) {
    try {
      req.auth = jwt.verify(token, env.jwtSecret) as AuthPayload;
    } catch {
      /* ignore — callers that need auth use requireAuth */
    }
  }
  next();
}

/** Requires a valid Bearer token; throws 401 otherwise. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) throw new HttpError(401, "Authentication required");
  try {
    req.auth = jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  // `next()` is called outside the try/catch: requireAdmin (below) passes its
  // own role-check as this `next`, and if that's called from inside the try
  // block, its 403 gets caught right here and misreported as a generic 401.
  next();
}

/** Requires a valid admin token; throws 403 if role is not admin. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "admin") throw new HttpError(403, "Admin access required");
    next();
  });
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}
