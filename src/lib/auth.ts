import { NextRequest } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { ApiError } from "@/lib/errors";

const userInclude = {
  patient: true,
  doctor: true,
} as const;

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

async function loadUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: userInclude,
  });
}

export async function getCurrentUser(req?: NextRequest | Request | null) {
  const header =
    req?.headers.get("authorization") ?? req?.headers.get("Authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    try {
      const payload = await verifyAccessToken(token);
      return loadUser(payload.sub);
    } catch {
      return null;
    }
  }

  const session = await auth();
  if (session?.user?.id) {
    return loadUser(session.user.id);
  }
  return null;
}

export function assertRole(user: CurrentUser | null, roles: Role[]) {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError("ACCOUNT_INACTIVE", "Account is inactive", 403);
  }
  if (!roles.includes(user.role)) {
    throw new ApiError("FORBIDDEN", "You do not have access to this resource", 403);
  }
  return user;
}

export function isAdmin(user: CurrentUser | null) {
  return user?.role === Role.ADMIN;
}

export function isDoctor(user: CurrentUser | null) {
  return user?.role === Role.DOCTOR;
}

export function isPatient(user: CurrentUser | null) {
  return user?.role === Role.PATIENT;
}
