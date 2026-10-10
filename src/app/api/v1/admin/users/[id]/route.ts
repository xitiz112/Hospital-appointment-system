import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { adminUserPatchSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true } },
  doctor: { select: { id: true } },
} as const;

/** Blocks removing or disabling the only remaining active administrator. */
async function assertNotLastAdmin(target: { id: string; role: Role; status: UserStatus }) {
  if (target.role !== Role.ADMIN || target.status !== UserStatus.ACTIVE) return;
  const others = await prisma.user.count({
    where: { role: Role.ADMIN, status: UserStatus.ACTIVE, id: { not: target.id } },
  });
  if (others === 0) {
    throw new ApiError("LAST_ADMIN", "At least one active administrator is required", 400);
  }
}

export const GET = apiHandler(async ({ params }) => {
  const found = await prisma.user.findUnique({ where: { id: params.id }, select: userSelect });
  if (!found) throw new ApiError("NOT_FOUND", "User not found", 404);
  return jsonOk(found);
}, { auth: true, roles: [Role.ADMIN] });

export const PATCH = apiHandler(async ({ req, params, user }) => {
  const { password, ...body } = adminUserPatchSchema.parse(await readJson(req));
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) throw new ApiError("NOT_FOUND", "User not found", 404);

  if (body.status === UserStatus.INACTIVE && target.status === UserStatus.ACTIVE) {
    if (target.id === user?.id) {
      throw new ApiError("FORBIDDEN", "You cannot deactivate your own account", 400);
    }
    await assertNotLastAdmin(target);
  }

  const email = body.email?.toLowerCase();
  if ((email && email !== target.email) || (body.phone && body.phone !== target.phone)) {
    const clash = await prisma.user.findFirst({
      where: {
        id: { not: target.id },
        OR: [...(email ? [{ email }] : []), ...(body.phone ? [{ phone: body.phone }] : [])],
      },
    });
    if (clash) throw new ApiError("EMAIL_TAKEN", "Another account already uses this email or phone", 409);
  }

  const passwordHash = password ? await hashPassword(password) : undefined;
  // A new password or deactivation signs the user out of every device.
  const revokeSessions = Boolean(passwordHash) || body.status === UserStatus.INACTIVE;

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: params.id },
      data: {
        name: body.name,
        email,
        phone: body.phone === undefined ? undefined : body.phone,
        status: body.status,
        passwordHash,
      },
      select: userSelect,
    }),
    ...(revokeSessions
      ? [
          prisma.refreshToken.updateMany({
            where: { userId: params.id, revokedAt: null },
            data: { revokedAt: new Date() },
          }),
        ]
      : []),
  ]);

  await writeAudit({
    actorId: user?.id,
    action: "USER_UPDATED",
    entity: "User",
    entityId: updated.id,
    payload: { ...body, passwordChanged: Boolean(passwordHash) },
  });
  return jsonOk(updated);
}, { auth: true, roles: [Role.ADMIN] });

export const DELETE = apiHandler(async ({ params, user }) => {
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { _count: { select: { appointments: true } } } },
      doctor: { select: { _count: { select: { appointments: true } } } },
      _count: { select: { cancellations: true, reschedules: true } },
    },
  });
  if (!target) throw new ApiError("NOT_FOUND", "User not found", 404);
  if (target.id === user?.id) {
    throw new ApiError("FORBIDDEN", "You cannot delete your own account", 400);
  }
  await assertNotLastAdmin(target);

  const appointments =
    (target.patient?._count.appointments ?? 0) + (target.doctor?._count.appointments ?? 0);
  if (appointments > 0) {
    throw new ApiError(
      "HAS_APPOINTMENTS",
      `Cannot delete a user with ${appointments} appointment(s). Deactivate the account instead.`,
      409,
    );
  }
  if (target._count.cancellations + target._count.reschedules > 0) {
    throw new ApiError(
      "HAS_HISTORY",
      "This user has cancelled or rescheduled appointments on record. Deactivate the account instead.",
      409,
    );
  }

  await prisma.user.delete({ where: { id: target.id } });
  await writeAudit({
    actorId: user?.id,
    action: "USER_DELETED",
    entity: "User",
    entityId: target.id,
    payload: { email: target.email, role: target.role },
  });
  return jsonOk({ deleted: true });
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = PATCH;
