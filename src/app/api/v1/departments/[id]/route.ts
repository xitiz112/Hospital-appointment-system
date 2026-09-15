import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { departmentSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const GET = apiHandler(async ({ params }) => {
  const department = await prisma.department.findUnique({
    where: { id: params.id },
    include: {
      doctors: {
        include: { user: { select: { name: true, imageUrl: true, status: true } } },
      },
      specializations: true,
    },
  });
  if (!department) throw new ApiError("NOT_FOUND", "Department not found", 404);
  return jsonOk(department);
});

export const PATCH = apiHandler(async ({ req, params, user }) => {
  const body = departmentSchema.partial().parse(await readJson(req));
  const department = await prisma.department.update({
    where: { id: params.id },
    data: body,
  });
  await writeAudit({
    actorId: user?.id,
    action: "DEPARTMENT_UPDATED",
    entity: "Department",
    entityId: department.id,
    payload: body,
  });
  return jsonOk(department);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = PATCH;
