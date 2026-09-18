import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { generateRefreshToken, hashToken, refreshExpiryDate, signAccessToken } from "@/lib/jwt";
import { refreshSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req }) => {
  const body = refreshSchema.parse(await readJson(req));
  const tokenHash = hashToken(body.refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new ApiError(
      "SESSION_EXPIRED",
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = await signAccessToken({
    sub: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  });
  const next = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: stored.userId,
      tokenHash: next.tokenHash,
      expiresAt: refreshExpiryDate(),
    },
  });

  return jsonOk({
    accessToken,
    refreshToken: next.token,
    tokenType: "Bearer",
    expiresIn: 15 * 60,
  });
});

export const OPTIONS = POST;
