import { Role } from "@prisma/client";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { sendEmail } from "@/lib/mail";
import { z } from "zod";

/** Admin-only: shows whether email env is present and can send a test message. */
export const GET = apiHandler(async () => {
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  const smtp = Boolean(process.env.SMTP_HOST?.trim());
  return jsonOk({
    resendApiKeyPresent: resend,
    smtpHostPresent: smtp,
    emailFrom: process.env.EMAIL_FROM?.trim() || null,
    appUrl: process.env.APP_URL?.trim() || null,
    configured: resend || smtp,
    hint: resend
      ? "Using Resend API"
      : smtp
        ? "Using SMTP"
        : "No RESEND_API_KEY or SMTP_HOST — emails will not send in production",
  });
}, { auth: true, roles: [Role.ADMIN] });

const testSchema = z.object({
  to: z.string().email(),
});

/** Admin-only: send a test email to confirm Resend/SMTP works. */
export const POST = apiHandler(async ({ req }) => {
  const body = testSchema.parse(await readJson(req));
  try {
    const result = await sendEmail({
      to: body.to,
      subject: "Hospital appointment system — test email",
      text: "If you received this, email delivery is working.",
    });
    return jsonOk({ ok: true, channel: result.channel, to: body.to });
  } catch (error) {
    throw new ApiError(
      "EMAIL_SEND_FAILED",
      error instanceof Error ? error.message : "Email send failed",
      502,
    );
  }
}, { auth: true, roles: [Role.ADMIN] });
