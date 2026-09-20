type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || "Hospital Appointments <noreply@localhost>";
}

async function sendViaResend(input: SendEmailInput) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br/>"),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}): ${detail}`);
  }
  return true;
}

async function sendViaSmtp(input: SendEmailInput) {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return false;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
  await transporter.sendMail({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? input.text.replace(/\n/g, "<br/>"),
  });
  return true;
}

/** Send email via Resend or SMTP. In development, falls back to console.log if neither is configured. */
export async function sendEmail(input: SendEmailInput) {
  if (await sendViaResend(input)) return { channel: "resend" as const };
  if (await sendViaSmtp(input)) return { channel: "smtp" as const };

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY (recommended on Vercel) or SMTP_HOST/SMTP_USER/SMTP_PASS + EMAIL_FROM.",
    );
  }
  console.log(`[mail:dev] to=${input.to} subject=${input.subject}\n${input.text}`);
  return { channel: "console" as const };
}

/** Password reset email — opens the Expo/native app (via https bridge), not a web form. */
export async function sendPasswordResetEmail(
  to: string,
  links: { primary: string; app: string },
) {
  return sendEmail({
    to,
    subject: "Reset your hospital appointment password",
    text: [
      "You requested a password reset.",
      "",
      "Tap this link to open the app and choose a new password (expires in 1 hour):",
      links.primary,
      "",
      "If the app does not open, paste this into Expo / your phone browser after installing the app:",
      links.app,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>You requested a password reset.</p>
      <p>
        <a href="${links.primary}"
           style="display:inline-block;padding:12px 18px;background:#1B4F72;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Open app to reset password
        </a>
      </p>
      <p style="font-size:12px;color:#666;">This opens the mobile app reset screen (not a website form). Link expires in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
