import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { doctorUpdateSchema } from "@/lib/validators";
import { doctorPublicSelect } from "@/lib/slots";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

export const GET = apiHandler(async ({ params }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: params.id },
    select: {
      ...doctorPublicSelect,
      breaks: { select: { weekday: true, startMin: true, endMin: true, label: true } },
    },
  });
  if (!doctor) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  return jsonOk(doctor);
});

export const PATCH = apiHandler(async ({ req, params, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const existing = await prisma.doctor.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  const isOwn = user.role === Role.DOCTOR && user.doctor?.id === existing.id;
  if (user.role !== Role.ADMIN && !isOwn) {
    throw new ApiError("FORBIDDEN", "You cannot update this doctor", 403);
  }
  const body = doctorUpdateSchema.parse(await readJson(req));

  if (user.role === Role.ADMIN && (body.name || body.phone)) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { name: body.name, phone: body.phone },
    });
  }

  const doctor = await prisma.doctor.update({
    where: { id: params.id },
    data: {
      departmentId: user.role === Role.ADMIN ? body.departmentId : undefined,
      specializationId: user.role === Role.ADMIN ? body.specializationId : undefined,
      qualifications: body.qualifications,
      experienceYears: body.experienceYears,
      consultationFee: user.role === Role.ADMIN ? body.consultationFee : undefined,
      appointmentDurationMin: body.appointmentDurationMin,
      location: body.location,
      bio: body.bio,
      isAvailable: user.role === Role.ADMIN ? body.isAvailable : body.isAvailable,
    },
    select: doctorPublicSelect,
  });

  if (body.isAvailable !== undefined || body.appointmentDurationMin) {
    await notifyUser({
      userId: existing.userId,
      type: "SCHEDULE_CHANGED",
      title: "Profile updated",
      body: "Your professional profile or availability was updated.",
      data: { doctorId: doctor.id },
    });
  }

  await writeAudit({
    actorId: user.id,
    action: "DOCTOR_UPDATED",
    entity: "Doctor",
    entityId: doctor.id,
    payload: body,
  });
  return jsonOk(doctor);
}, { auth: true, roles: [Role.ADMIN, Role.DOCTOR] });

export const DELETE = apiHandler(async ({ params, user }) => {
  if (!user || user.role !== Role.ADMIN) {
    throw new ApiError("FORBIDDEN", "Only administrators can delete doctors", 403);
  }
  const existing = await prisma.doctor.findUnique({
    where: { id: params.id },
    include: { _count: { select: { appointments: true } } },
  });
  if (!existing) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  if (existing._count.appointments > 0) {
    throw new ApiError(
      "HAS_APPOINTMENTS",
      `Cannot delete doctor with ${existing._count.appointments} appointment(s). Deactivate the account instead.`,
      409,
    );
  }

  await prisma.user.delete({ where: { id: existing.userId } });
  await writeAudit({
    actorId: user.id,
    action: "DOCTOR_DELETED",
    entity: "Doctor",
    entityId: existing.id,
    payload: { userId: existing.userId },
  });
  return jsonOk({ deleted: true });
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = PATCH;
