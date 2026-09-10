import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { specializationSchema } from "@/lib/validators";

export const PATCH = apiHandler(async ({ req, params }) => {
  const body = specializationSchema.partial().parse(await readJson(req));
  const item = await prisma.specialization.update({ where: { id: params.id }, data: body });
  return jsonOk(item);
}, { auth: true, roles: [Role.ADMIN] });

export const DELETE = apiHandler(async ({ params }) => {
  await prisma.specialization.delete({ where: { id: params.id } });
  return jsonOk({ deleted: true });
}, { auth: true, roles: [Role.ADMIN] });
