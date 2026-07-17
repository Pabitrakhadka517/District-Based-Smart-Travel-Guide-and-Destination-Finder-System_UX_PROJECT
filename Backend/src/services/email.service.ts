import nodemailer from "nodemailer";
import { env } from "../config/env";

function createTransport() {
  if (!env.emailHost || !env.emailUser) return null;
  return nodemailer.createTransport({
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailPort === 465,
    auth: { user: env.emailUser, pass: env.emailPass }
  });
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransport();
  if (!transporter) {
    if (env.nodeEnv === "production") {
      // Never print an email body (which may contain a live reset/verification
      // link) to logs in production — log aggregators would capture it.
      console.error(`[EMAIL] No SMTP transporter configured — cannot send "${subject}" to ${to}. Set EMAIL_HOST/EMAIL_USER.`);
      return;
    }
    // Dev-only fallback: print to console instead of sending
    console.log("\n========== [EMAIL] (development only — not sent) ==========");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}`);
    console.log("=============================================================\n");
    return;
  }
  await transporter.sendMail({ from: env.emailFrom, to, subject, html });
}

const emailHtml = (title: string, body: string, buttonText: string, buttonUrl: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <h1 style="color:#1e3a5f;font-size:22px;margin:0 0 8px">${title}</h1>
    <div style="color:#555;font-size:15px;line-height:1.6;margin-bottom:24px">${body}</div>
    <a href="${buttonUrl}"
       style="display:inline-block;background:#e8a020;color:#fff;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px"
    >${buttonText}</a>
    <p style="color:#999;font-size:12px;margin-top:24px">
      If the button doesn't work, copy this link into your browser:<br>
      <a href="${buttonUrl}" style="color:#1e3a5f">${buttonUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#bbb;font-size:12px;margin:0">
      You're receiving this email because you registered at NepalYatra.
    </p>
  </div>
</body>
</html>`;

export async function sendContactNotificationEmail(
  fromName: string,
  fromEmail: string,
  subject: string,
  message: string
): Promise<void> {
  if (!env.contactEmail) return; // no destination configured — message is still persisted to the DB
  await send(
    env.contactEmail,
    `[Contact] ${subject}`,
    `<p><strong>From:</strong> ${fromName} (${fromEmail})</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>`
  );
}

export async function sendBookingStatusEmail(
  to: string,
  name: string,
  destinationName: string,
  travelDate: string,
  status: "confirmed" | "cancelled"
): Promise<void> {
  const isConfirmed = status === "confirmed";
  await send(
    to,
    isConfirmed ? `Your booking for ${destinationName} is confirmed` : `Your booking for ${destinationName} was cancelled`,
    emailHtml(
      isConfirmed ? `Good news, ${name}!` : `Booking update, ${name}`,
      isConfirmed
        ? `Your booking for <strong>${destinationName}</strong> on <strong>${travelDate}</strong> has been confirmed. We can't wait for you to explore Nepal!`
        : `Your booking for <strong>${destinationName}</strong> on <strong>${travelDate}</strong> has been cancelled. If you think this is a mistake, please get in touch.`,
      "View my bookings",
      `${env.frontendUrl}/booking`
    )
  );
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${env.frontendUrl}/reset-password?token=${token}`;
  await send(
    to,
    "Reset your NepalYatra password",
    emailHtml(
      `Reset your password, ${name}`,
      "We received a request to reset your NepalYatra password. Click the button below to choose a new password. This link expires in <strong>30 minutes</strong>.<br><br>If you didn't request this, you can safely ignore this email.",
      "Reset Password",
      url
    )
  );
}
