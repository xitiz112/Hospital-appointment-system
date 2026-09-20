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

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your hospital appointment password",
    text: [
      "You requested a password reset.",
      "",
      "Open this link within 1 hour to choose a new password:",
      resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}">Reset your password</a> (link expires in 1 hour).</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
