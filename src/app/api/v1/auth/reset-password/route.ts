import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { hashToken } from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validators";

function normalizeResetToken(raw: string) {
  const trimmed = raw.trim();
  try {
    // Deep links often URI-encode the token; hashing must use the raw hex value.
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export const POST = apiHandler(async ({ req }) => {
  const body = resetPasswordSchema.parse(await readJson(req));
  const token = normalizeResetToken(body.token);
  const tokenHash = hashToken(token);

  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw new ApiError("INVALID_TOKEN", "Reset token is invalid or expired", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    throw new ApiError("INVALID_TOKEN", "Reset token is invalid or expired", 400);
  }

  // Prevent a no-op "reset" that leaves the old password working.
  if (await verifyPassword(body.password, user.passwordHash)) {
    throw new ApiError(
      "SAME_PASSWORD",
      "Choose a different password than the one you use now.",
      400,
    );
  }

  // Hash before the transaction so we never leave a half-applied update.
  const passwordHash = await hashPassword(body.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    });
    // Consume this token and any other outstanding reset tokens for the user.
    await tx.passwordResetToken.updateMany({
      where: { userId: stored.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  return jsonOk({
    reset: true,
    message: "Password updated. Sign in with your new password.",
  });
});

export const OPTIONS = POST;
