import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { User } from "../models/User";
import { AuditLog } from "../models/AuditLog";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { signToken } from "../middleware/auth";
import { genId, today } from "../utils/ids";
import { sendPasswordResetEmail } from "../services/email.service";
import { env } from "../config/env";
import { sanitizeImage } from "../utils/sanitize";
import { deleteImage } from "../services/cloudinary.service";

const REFRESH_COOKIE    = "nepalyatra_rt";
const BCRYPT_ROUNDS     = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS  = 15 * 60 * 1000;        // 15 minutes
const REFRESH_TTL_MS    = 7  * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE   = /^https?:\/\/.+/;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueRefreshToken(): { plain: string; hashed: string } {
  const plain = crypto.randomBytes(40).toString("hex");
  return { plain, hashed: hashToken(plain) };
}

function setRefreshCookie(res: Response, token: string, rememberMe: boolean): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: rememberMe ? REFRESH_REMEMBER_TTL_MS : REFRESH_TTL_MS,
    path: "/"
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

async function audit(userId: string, action: string, req: Request, metadata?: object): Promise<void> {
  try {
    await AuditLog.create({
      id: genId("al"),
      userId,
      action,
      ip: req.ip ?? (req.socket?.remoteAddress ?? ""),
      userAgent: (req.headers["user-agent"] ?? "").slice(0, 300),
      metadata: metadata ?? {},
      createdAt: new Date()
    });
  } catch {
    // Never fail a request because audit logging failed
  }
}

// POST /api/auth/register   { name, email, password }
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) return fail(res, "name, email and password are required", 400);
  if (String(name).trim().length < 2)   return fail(res, "Name must be at least 2 characters", 400);
  if (!EMAIL_RE.test(String(email)))     return fail(res, "Invalid email address", 400);
  if (String(password).length < 8)      return fail(res, "Password must be at least 8 characters", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return fail(res, "An account with that email already exists", 409);

  const hash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);

  const user = await User.create({
    id: genId("u"),
    name: String(name).trim(),
    email: normalizedEmail,
    password: hash,
    role: "user",
    joinedAt: today(),
    isActive: true
  });

  await audit(user.id, "register", req, { email: user.email });

  const accessToken = signToken({ sub: user.id, role: "user" });
  const { plain: rtPlain, hashed: rtHashed } = issueRefreshToken();

  await User.updateOne(
    { id: user.id },
    {
      refreshTokens: [{
        token: rtHashed,
        device: String(req.headers["user-agent"] ?? "unknown").slice(0, 200),
        rememberMe: false,
        createdAt: new Date()
      }]
    }
  );

  setRefreshCookie(res, rtPlain, false);
  ok(res, { token: accessToken, user: user.toJSON() }, 201);
});

// POST /api/auth/login   { email, password, rememberMe? }
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe = false } = req.body ?? {};
  if (!email || !password) return fail(res, "email and password are required", 400);

  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    "+password +loginAttempts +lockUntil +refreshTokens +isActive"
  );

  const invalidMsg = "Invalid email or password";
  if (!user) return fail(res, invalidMsg, 401);

  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    const mins = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
    return fail(res, `Account temporarily locked. Try again in ${mins} minute(s).`, 423);
  }

  if (user.isActive === false) {
    return fail(res, "Your account has been deactivated. Contact support.", 403);
  }

  const match = await bcrypt.compare(String(password), user.password);
  if (!match) {
    const attempts = (user.loginAttempts ?? 0) + 1;
    const updateFields: Record<string, unknown> = { loginAttempts: attempts };
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updateFields.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      updateFields.loginAttempts = 0;
    }
    await User.updateOne({ id: user.id }, updateFields);
    await audit(user.id, "login_failed", req, { attempts });
    return fail(res, invalidMsg, 401);
  }

  const accessToken = signToken({ sub: user.id, role: user.role as "user" | "admin" });
  const { plain: rtPlain, hashed: rtHashed } = issueRefreshToken();
  const remember = Boolean(rememberMe);

  // Keep at most 5 refresh tokens per user (drop oldest first)
  const existing = ((user.refreshTokens as unknown[]) ?? []).slice(-4);
  await User.updateOne(
    { id: user.id },
    {
      loginAttempts: 0,
      $unset: { lockUntil: 1 },
      lastLogin: today(),
      refreshTokens: [
        ...existing,
        {
          token: rtHashed,
          device: String(req.headers["user-agent"] ?? "unknown").slice(0, 200),
          rememberMe: remember,
          createdAt: new Date()
        }
      ]
    }
  );

  setRefreshCookie(res, rtPlain, remember);
  await audit(user.id, "login", req, { rememberMe: remember });
  ok(res, { token: accessToken, user: user.toJSON() });
});

// POST /api/auth/refresh   (refresh token in cookie)
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rtPlain = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!rtPlain) return fail(res, "Refresh token required", 401);

  const hashed = hashToken(rtPlain);
  const user = await User.findOne({ "refreshTokens.token": hashed }).select("+refreshTokens");

  if (!user) {
    clearRefreshCookie(res);
    return fail(res, "Invalid or expired session. Please log in again.", 401);
  }

  type RTEntry = { token: string; device: string; rememberMe: boolean; createdAt: Date };
  const entry = (user.refreshTokens as RTEntry[]).find((t) => t.token === hashed);
  if (!entry) {
    clearRefreshCookie(res);
    return fail(res, "Invalid or expired session. Please log in again.", 401);
  }

  const { plain: newPlain, hashed: newHashed } = issueRefreshToken();
  const remember = entry.rememberMe ?? false;

  // Atomic token rotation: replace the matched element in one operation
  await User.updateOne(
    { id: user.id, "refreshTokens.token": hashed },
    {
      $set: {
        "refreshTokens.$": {
          token: newHashed,
          device: entry.device,
          rememberMe: remember,
          createdAt: new Date()
        }
      }
    }
  );

  const accessToken = signToken({ sub: user.id, role: user.role as "user" | "admin" });
  setRefreshCookie(res, newPlain, remember);
  ok(res, { token: accessToken, user: user.toJSON() });
});

// POST /api/auth/logout
// Invalidates the refresh token by cookie value alone — no valid access token required.
// This fixes the bug where users with expired access tokens couldn't log out their session.
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rtPlain = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  if (rtPlain) {
    const hashed = hashToken(rtPlain);
    await User.updateOne(
      { "refreshTokens.token": hashed },
      { $pull: { refreshTokens: { token: hashed } } }
    );
    if (req.auth?.sub) {
      await audit(req.auth.sub, "logout", req);
    }
  }

  clearRefreshCookie(res);
  ok(res, { message: "Logged out successfully" });
});

// POST /api/auth/logout-all   (requireAuth)
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await User.updateOne({ id: req.auth!.sub }, { refreshTokens: [] });
  clearRefreshCookie(res);
  await audit(req.auth!.sub, "logout_all", req);
  ok(res, { message: "Logged out from all devices" });
});

// GET /api/auth/me
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ id: req.auth!.sub });
  if (!user) return fail(res, "User not found", 404);
  ok(res, user);
});

// PATCH /api/auth/profile   { name?, avatar? }
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, avatar } = req.body ?? {};
  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (String(name).trim().length < 2) return fail(res, "Name must be at least 2 characters", 400);
    updates.name = String(name).trim();
  }

  let previousAvatarPublicId: string | null = null;
  if (avatar !== undefined) {
    const sanitized = sanitizeImage(avatar);
    if (!sanitized || !URL_RE.test(sanitized.url)) {
      return fail(res, "avatar must be a valid image object with an http/https url", 400);
    }
    const existing = await User.findOne({ id: req.auth!.sub }).select("avatar");
    previousAvatarPublicId = existing?.avatar?.publicId ?? null;
    updates.avatar = sanitized;
  }

  if (Object.keys(updates).length === 0) return fail(res, "No fields to update", 400);

  const user = await User.findOneAndUpdate({ id: req.auth!.sub }, updates, { new: true });
  if (!user) return fail(res, "User not found", 404);

  // Best-effort cleanup of the old Cloudinary asset — never fails the request
  if (previousAvatarPublicId && previousAvatarPublicId !== (updates.avatar as { publicId: string | null })?.publicId) {
    void deleteImage(previousAvatarPublicId);
  }

  await audit(req.auth!.sub, "profile_update", req, { fields: Object.keys(updates) });
  ok(res, user);
});

// POST /api/auth/change-password   { currentPassword, newPassword }
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) return fail(res, "currentPassword and newPassword are required", 400);
  if (String(newPassword).length < 8)   return fail(res, "New password must be at least 8 characters", 400);

  const user = await User.findOne({ id: req.auth!.sub }).select("+password");
  if (!user) return fail(res, "User not found", 404);

  const match = await bcrypt.compare(String(currentPassword), user.password);
  if (!match) return fail(res, "Current password is incorrect", 401);

  const hash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
  await User.updateOne({ id: req.auth!.sub }, { password: hash, refreshTokens: [] });

  clearRefreshCookie(res);
  await audit(req.auth!.sub, "password_change", req);
  ok(res, { message: "Password updated successfully. Please log in again." });
});

// POST /api/auth/forgot-password   { email }
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (!email) return fail(res, "email is required", 400);

  const user = await User.findOne({ email: String(email).toLowerCase() });
  // Always return the same message regardless of whether the email exists (prevents enumeration)
  const safeMsg = { message: "If that email exists, a password reset link has been sent." };

  if (user) {
    const resetToken  = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await User.updateOne(
      { id: user.id },
      { passwordResetToken: hashToken(resetToken), passwordResetExpiry: resetExpiry }
    );

    sendPasswordResetEmail(user.email, user.name, resetToken).catch(console.error);
    await audit(user.id, "forgot_password", req);

    return ok(res, safeMsg);
  }

  ok(res, safeMsg);
});

// POST /api/auth/reset-password   { token, password }
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body ?? {};
  if (!token || !password) return fail(res, "token and password are required", 400);
  if (String(password).length < 8) return fail(res, "Password must be at least 8 characters", 400);

  const hashed = hashToken(String(token));
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiry: { $gt: new Date() }
  }).select("+passwordResetToken +passwordResetExpiry");

  if (!user) return fail(res, "Invalid or expired reset link. Please request a new one.", 400);

  const hash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);

  await User.updateOne(
    { id: user.id },
    {
      password: hash,
      refreshTokens: [],
      $unset: { passwordResetToken: 1, passwordResetExpiry: 1 }
    }
  );

  clearRefreshCookie(res);
  await audit(user.id, "password_reset", req);
  ok(res, { message: "Password has been reset. You can now log in." });
});

