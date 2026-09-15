import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { generateResetToken } from "@/lib/jwt";
import { forgotPasswordSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req }) => {
  const body = forgotPasswordSchema.parse(await readJson(req));
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (user) {
    const { token, tokenHash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    console.log(`[password-reset] ${user.email} ${url}`);
  }
  return jsonOk({
    message: "If that email exists, a reset link was created. In development it is logged to the server console.",
  });
});

export const OPTIONS = POST;
