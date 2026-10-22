import { prisma } from "@/lib/prisma";

// Failed sign-ins are recorded in AuditLog so the limit holds across serverless instances.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const ACTION = "LOGIN_FAILED";
const ENTITY = "Login";

export const LOGIN_LOCK_MINUTES = WINDOW_MS / 60_000;

/** True when this email has too many recent failed sign-ins. */
export async function isLoginLocked(email: string) {
  const failures = await prisma.auditLog.count({
    where: {
      action: ACTION,
      entity: ENTITY,
      entityId: email,
      createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
    },
  });
  return failures >= MAX_FAILURES;
}

export async function recordLoginFailure(email: string, ip?: string | null) {
  await prisma.auditLog.create({
    data: { action: ACTION, entity: ENTITY, entityId: email, payload: ip ? { ip } : undefined },
  });
}

/** A successful sign-in clears the failure count. */
export async function clearLoginFailures(email: string) {
  await prisma.auditLog.deleteMany({ where: { action: ACTION, entity: ENTITY, entityId: email } });
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
}
