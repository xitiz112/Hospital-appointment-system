import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { departmentSchema } from "@/lib/validators";
import { getHospital } from "@/lib/appointments";

export const GET = apiHandler(async () => {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { doctors: true } } },
  });
  return jsonOk(departments);
});

export const POST = apiHandler(async ({ req }) => {
  const body = departmentSchema.parse(await readJson(req));
  const hospital = await getHospital();
  const existing = await prisma.department.findFirst({
    where: { hospitalId: hospital.id, name: body.name },
  });
  if (existing) throw new ApiError("CONFLICT", "Department already exists", 409);
  const department = await prisma.department.create({
    data: {
      hospitalId: hospital.id,
      name: body.name,
      description: body.description,
      isActive: body.isActive ?? true,
    },
  });
  return jsonOk(department, undefined, 201);
}, { auth: true, roles: [Role.ADMIN] });
