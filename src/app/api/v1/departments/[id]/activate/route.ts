import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const POST = apiHandler(async ({ params, user }) => {
  const department = await prisma.department.update({
    where: { id: params.id },
    data: { isActive: true },
  });
  await writeAudit({
    actorId: user?.id,
    action: "DEPARTMENT_ACTIVATED",
    entity: "Department",
    entityId: department.id,
  });
  return jsonOk(department);
}, { auth: true, roles: [Role.ADMIN] });
