import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateRefreshToken, refreshExpiryDate, signAccessToken } from "@/lib/jwt";
import { ApiError } from "@/lib/errors";

export async function issueTokenPair(user: { id: string; email: string; role: Role; status: UserStatus }) {
  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError("ACCOUNT_INACTIVE", "Account is inactive", 403);
  }
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refresh = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refreshExpiryDate(),
    },
  });
  return { accessToken, refreshToken: refresh.token, tokenType: "Bearer" as const, expiresIn: 15 * 60 };
}

export function publicUser(user: {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: Role;
  status: UserStatus;
  imageUrl: string | null;
  patient?: unknown;
  doctor?: unknown;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    status: user.status,
    imageUrl: user.imageUrl,
    patient: user.patient ?? null,
    doctor: user.doctor ?? null,
  };
}
