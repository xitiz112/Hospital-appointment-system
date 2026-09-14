import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { bookAppointment } from "@/lib/appointments";
import { scopedAppointmentWhere } from "@/lib/rbac";
import { bookAppointmentSchema } from "@/lib/validators";

export const GET = apiHandler(async ({ req, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
  const where = {
    ...scopedAppointmentWhere(user),
    ...(status ? { status: status as never } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        doctor: { include: { user: { select: { name: true, imageUrl: true } }, department: true } },
        patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
        payments: true,
      },
    }),
  ]);
  return jsonOk(items, { page, pageSize, total });
}, { auth: true });

export const POST = apiHandler(async ({ req, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const body = bookAppointmentSchema.parse(await readJson(req));
  const result = await bookAppointment(user, {
    doctorId: body.doctorId,
    startAt: new Date(body.startAt),
    notes: body.notes,
    patientId: body.patientId,
  });
  return jsonOk(result, undefined, 201);
}, { auth: true, roles: [Role.PATIENT, Role.ADMIN] });
