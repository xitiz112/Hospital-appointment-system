import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { adminUserPatchSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const PATCH = apiHandler(async ({ req, params, user }) => {
  const body = adminUserPatchSchema.parse(await readJson(req));
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) throw new ApiError("NOT_FOUND", "User not found", 404);
  if (target.id === user?.id && body.status === "INACTIVE") {
    throw new ApiError("FORBIDDEN", "You cannot deactivate your own account", 400);
  }
  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.name ? { name: body.name } : {}),
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  await writeAudit({
    actorId: user?.id,
    action: "USER_UPDATED",
    entity: "User",
    entityId: updated.id,
    payload: body,
  });
  return jsonOk(updated);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = PATCH;
