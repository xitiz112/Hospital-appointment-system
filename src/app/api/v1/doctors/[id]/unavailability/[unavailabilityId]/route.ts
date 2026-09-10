import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { assertDoctorOwn } from "@/lib/rbac";

export const DELETE = apiHandler(async ({ params, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const item = await prisma.doctorUnavailability.findUnique({ where: { id: params.unavailabilityId } });
  if (!item) throw new ApiError("NOT_FOUND", "Unavailability not found", 404);
  assertDoctorOwn(user, item.doctorId);
  await prisma.doctorUnavailability.delete({ where: { id: item.id } });
  return jsonOk({ deleted: true });
}, { auth: true, roles: [Role.ADMIN, Role.DOCTOR] });
