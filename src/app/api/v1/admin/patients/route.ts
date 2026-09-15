import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { adminPatientCreateSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const GET = apiHandler(async ({ req }) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: { user: { select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return jsonOk(patients);
}, { auth: true, roles: [Role.ADMIN] });

export const POST = apiHandler(async ({ req, user }) => {
  const body = adminPatientCreateSchema.parse(await readJson(req));
  const email = body.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(body.phone ? [{ phone: body.phone }] : [])] },
  });
  if (existing) throw new ApiError("EMAIL_TAKEN", "An account with this email or phone already exists", 409);

  const patient = await prisma.patient.create({
    data: {
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      gender: body.gender ?? undefined,
      address: body.address ?? undefined,
      user: {
        create: {
          email,
          phone: body.phone,
          passwordHash: await hashPassword(body.password ?? "Password123!"),
          name: body.name,
          role: Role.PATIENT,
        },
      },
    },
    include: { user: true },
  });
  await writeAudit({
    actorId: user?.id,
    action: "PATIENT_CREATED",
    entity: "Patient",
    entityId: patient.id,
  });
  return jsonOk(patient, undefined, 201);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = POST;
