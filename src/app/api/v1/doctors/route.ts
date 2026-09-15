import { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { doctorCreateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { doctorPublicSelect } from "@/lib/slots";
import { getHospital } from "@/lib/appointments";
import { writeAudit } from "@/lib/audit";

export const GET = apiHandler(async ({ req }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const departmentId = url.searchParams.get("departmentId") ?? undefined;
  const specializationId = url.searchParams.get("specializationId") ?? undefined;
  const available = url.searchParams.get("available");
  const minFee = url.searchParams.get("minFee");
  const maxFee = url.searchParams.get("maxFee");
  const sort = url.searchParams.get("sort") ?? "name";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));

  const where: Prisma.DoctorWhereInput = {
    user: { status: UserStatus.ACTIVE },
    department: { isActive: true },
  };
  if (departmentId) where.departmentId = departmentId;
  if (specializationId) where.specializationId = specializationId;
  if (available === "true") where.isAvailable = true;
  if (available === "false") where.isAvailable = false;
  if (minFee || maxFee) {
    where.consultationFee = {};
    if (minFee) where.consultationFee.gte = minFee;
    if (maxFee) where.consultationFee.lte = maxFee;
  }
  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { qualifications: { contains: q, mode: "insensitive" } },
      { department: { name: { contains: q, mode: "insensitive" } } },
      { specialization: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orderBy: Prisma.DoctorOrderByWithRelationInput =
    sort === "fee"
      ? { consultationFee: "asc" }
      : sort === "fee_desc"
        ? { consultationFee: "desc" }
        : sort === "experience"
          ? { experienceYears: "desc" }
          : { user: { name: "asc" } };

  const [total, items] = await prisma.$transaction([
    prisma.doctor.count({ where }),
    prisma.doctor.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: doctorPublicSelect,
    }),
  ]);

  return jsonOk(items, { page, pageSize, total });
});

export const POST = apiHandler(async ({ req, user }) => {
  const body = doctorCreateSchema.parse(await readJson(req));
  const hospital = await getHospital();
  const password = body.password ?? "Password123!";
  const email = body.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new ApiError("EMAIL_TAKEN", "Email already in use", 409);

  const created = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        phone: body.phone,
        passwordHash: await hashPassword(password),
        name: body.name,
        role: Role.DOCTOR,
        status: UserStatus.ACTIVE,
      },
    });
    return tx.doctor.create({
      data: {
        userId: u.id,
        hospitalId: hospital.id,
        departmentId: body.departmentId,
        specializationId: body.specializationId ?? undefined,
        qualifications: body.qualifications,
        experienceYears: body.experienceYears ?? 0,
        consultationFee: body.consultationFee,
        appointmentDurationMin: body.appointmentDurationMin ?? hospital.defaultAppointmentDurationMin,
        location: body.location,
        bio: body.bio,
        isAvailable: body.isAvailable ?? true,
      },
      select: doctorPublicSelect,
    });
  });

  await writeAudit({
    actorId: user?.id,
    action: "DOCTOR_CREATED",
    entity: "Doctor",
    entityId: created.id,
  });
  return jsonOk(created, undefined, 201);
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = POST;
