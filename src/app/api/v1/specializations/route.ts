import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { specializationSchema } from "@/lib/validators";

export const GET = apiHandler(async () => {
  const items = await prisma.specialization.findMany({
    orderBy: { name: "asc" },
    include: { department: { select: { id: true, name: true } } },
  });
  return jsonOk(items);
});

export const POST = apiHandler(async ({ req }) => {
  const body = specializationSchema.parse(await readJson(req));
  const item = await prisma.specialization.create({ data: body });
  return jsonOk(item, undefined, 201);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = POST;
