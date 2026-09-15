import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { hashToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req }) => {
  const body = resetPasswordSchema.parse(await readJson(req));
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(body.token) },
  });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw new ApiError("INVALID_TOKEN", "Reset token is invalid or expired", 400);
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash: await hashPassword(body.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  return jsonOk({ reset: true });
});

export const OPTIONS = POST;
