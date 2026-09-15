import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { doctorPublicSelect } from "@/lib/slots";

export const POST = apiHandler(async ({ params, user }) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: params.id } });
  if (!doctor) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  await prisma.user.update({
    where: { id: doctor.userId },
    data: { status: UserStatus.INACTIVE },
  });
  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { isAvailable: false },
  });
  await writeAudit({
    actorId: user?.id,
    action: "DOCTOR_DEACTIVATED",
    entity: "Doctor",
    entityId: doctor.id,
  });
  const fresh = await prisma.doctor.findUnique({ where: { id: doctor.id }, select: doctorPublicSelect });
  return jsonOk(fresh);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = POST;
