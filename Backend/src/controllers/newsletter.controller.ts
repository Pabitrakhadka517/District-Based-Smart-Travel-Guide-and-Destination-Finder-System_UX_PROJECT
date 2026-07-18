import type { Request, Response } from "express";
import { NewsletterSubscriber } from "../models/NewsletterSubscriber";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { genId } from "../utils/ids";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/newsletter — public. Re-subscribing with an email that's already
// on the list is treated as a successful no-op rather than a 409: from the
// visitor's point of view "you're already subscribed" is still success, and
// leaking whether an email is already subscribed isn't useful information to
// withhold either way.
export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return fail(res, "A valid email address is required", 400);
  }

  const existing = await NewsletterSubscriber.exists({ email });
  if (existing) return ok(res, { subscribed: true });

  await NewsletterSubscriber.create({ id: genId("nl"), email });
  ok(res, { subscribed: true }, 201);
});
