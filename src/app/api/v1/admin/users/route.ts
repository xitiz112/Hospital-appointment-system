import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { adminUserCreateSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const GET = apiHandler(async ({ req }) => {
  const role = new URL(req.url).searchParams.get("role");
  const users = await prisma.user.findMany({
    where: role ? { role: role as Role } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      patient: { select: { id: true } },
      doctor: { select: { id: true } },
    },
  });
  return jsonOk(users);
}, { auth: true, roles: [Role.ADMIN] });

export const POST = apiHandler(async ({ req, user }) => {
  const body = adminUserCreateSchema.parse(await readJson(req));
  const email = body.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(body.phone ? [{ phone: body.phone }] : [])] },
  });
  if (existing) throw new ApiError("EMAIL_TAKEN", "An account with this email or phone already exists", 409);

  const created = await prisma.user.create({
    data: {
      email,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      name: body.name,
      role: Role.ADMIN,
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  await writeAudit({
    actorId: user?.id,
    action: "ADMIN_CREATED",
    entity: "User",
    entityId: created.id,
  });
  return jsonOk(created, undefined, 201);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = POST;
