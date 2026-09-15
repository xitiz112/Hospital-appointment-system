import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { adminPatientUpdateSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const GET = apiHandler(async ({ params }) => {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      appointments: {
        orderBy: { startAt: "desc" },
        take: 50,
        include: { doctor: { include: { user: { select: { name: true } } } }, payments: true },
      },
    },
  });
  if (!patient) throw new ApiError("NOT_FOUND", "Patient not found", 404);
  return jsonOk(patient);
}, { auth: true, roles: [Role.ADMIN] });

export const PATCH = apiHandler(async ({ req, params, user }) => {
  const body = adminPatientUpdateSchema.parse(await readJson(req));
  const patient = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!patient) throw new ApiError("NOT_FOUND", "Patient not found", 404);

  const updated = await prisma.patient.update({
    where: { id: params.id },
    data: {
      dateOfBirth: body.dateOfBirth === undefined ? undefined : body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      gender: body.gender === undefined ? undefined : body.gender,
      address: body.address === undefined ? undefined : body.address,
      notifyEmail: body.notifyEmail,
      notifyPush: body.notifyPush,
      notifySms: body.notifySms,
      user: body.name || body.phone !== undefined
        ? {
            update: {
              ...(body.name ? { name: body.name } : {}),
              ...(body.phone !== undefined ? { phone: body.phone } : {}),
            },
          }
        : undefined,
    },
    include: { user: true },
  });
  await writeAudit({
    actorId: user?.id,
    action: "PATIENT_UPDATED",
    entity: "Patient",
    entityId: patient.id,
    payload: body,
  });
  return jsonOk(updated);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = PATCH;
