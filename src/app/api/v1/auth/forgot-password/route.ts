import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { generateResetToken } from "@/lib/jwt";
import { sendPasswordResetEmail } from "@/lib/mail";
import { buildPasswordResetLinks } from "@/lib/password-reset-link";
import { forgotPasswordSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req }) => {
  const body = forgotPasswordSchema.parse(await readJson(req));
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  let emailStatus: "sent" | "skipped_no_user" | "failed" | "dev_console" = "skipped_no_user";
  let emailError: string | null = null;

  if (user) {
    const { token, tokenHash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    let links;
    try {
      links = buildPasswordResetLinks(token, user.role);
    } catch (error) {
      emailStatus = "failed";
      emailError = error instanceof Error ? error.message : String(error);
      console.error("[password-reset] link build failed", emailError);
      return jsonOk({
        message: "If that email exists, a password reset link has been sent.",
        ...(process.env.NODE_ENV !== "production" ? { debug: { emailStatus, emailError } } : {}),
      });
    }
    try {
      const result = await sendPasswordResetEmail(user.email, links);
      emailStatus = result.channel === "console" ? "dev_console" : "sent";
      if (result.channel === "console") {
        console.log(`[password-reset] console fallback for ${user.email}: ${links.primary}`);
      }
    } catch (error) {
      emailStatus = "failed";
      emailError = error instanceof Error ? error.message : String(error);
      console.error("[password-reset] email failed", emailError);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[password-reset] fallback link for ${user.email}: ${links.primary}`);
      }
    }
  }

  return jsonOk({
    message: "If that email exists, a password reset link has been sent.",
    ...(process.env.NODE_ENV !== "production" ? { debug: { emailStatus, emailError } } : {}),
  });
});

export const OPTIONS = POST;
