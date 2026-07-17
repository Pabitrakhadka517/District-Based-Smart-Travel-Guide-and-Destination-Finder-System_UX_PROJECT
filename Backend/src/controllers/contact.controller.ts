import type { Request, Response } from "express";
import { ContactMessage } from "../models/ContactMessage";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";
import { sendContactNotificationEmail } from "../services/email.service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact
export const submitContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name) return fail(res, "Name is required", 400);
  if (!EMAIL_RE.test(email)) return fail(res, "A valid email address is required", 400);
  if (!subject) return fail(res, "Subject is required", 400);
  if (!message || message.length < 10) return fail(res, "Message must be at least 10 characters", 400);

  const created = await ContactMessage.create({
    id: genId("cm"),
    name: name.slice(0, 200),
    email: email.slice(0, 320),
    subject: subject.slice(0, 300),
    message: message.slice(0, 5000)
  });

  // Best-effort notification — the message is already durably stored above,
  // so a missing/misconfigured SMTP transport must never fail the request.
  sendContactNotificationEmail(created.name, created.email, created.subject, created.message).catch((err) => {
    console.error("[contact] Failed to send notification email:", err);
  });

  ok(res, { id: created.id }, 201);
});
