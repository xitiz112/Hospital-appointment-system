import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { getHospital } from "@/lib/appointments";
import { settingsSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const GET = apiHandler(async () => {
  return jsonOk(await getHospital());
}, { auth: true, roles: [Role.ADMIN] });

export const PATCH = apiHandler(async ({ req, user }) => {
  const hospital = await getHospital();
  const body = settingsSchema.parse(await readJson(req));
  const updated = await prisma.hospital.update({
    where: { id: hospital.id },
    data: body,
  });
  await writeAudit({
    actorId: user?.id,
    action: "SETTINGS_UPDATED",
    entity: "Hospital",
    entityId: hospital.id,
    payload: body,
  });
  return jsonOk(updated);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = PATCH;
