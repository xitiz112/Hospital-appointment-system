import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { patientStatusSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const PATCH = apiHandler(async ({ req, params, user }) => {
  const body = patientStatusSchema.parse(await readJson(req));
  const patient = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!patient) throw new ApiError("NOT_FOUND", "Patient not found", 404);
  await prisma.user.update({ where: { id: patient.userId }, data: { status: body.status } });
  await writeAudit({
    actorId: user?.id,
    action: "USER_STATUS",
    entity: "User",
    entityId: patient.userId,
    payload: body,
  });
  return jsonOk({ id: params.id, status: body.status });
}, { auth: true, roles: [Role.ADMIN] });
