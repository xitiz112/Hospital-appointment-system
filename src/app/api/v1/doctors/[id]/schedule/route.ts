import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { schedulesPutSchema } from "@/lib/validators";
import { assertDoctorOwn } from "@/lib/rbac";
import { notifyUser } from "@/lib/notifications";
import { writeAudit } from "@/lib/audit";

export const GET = apiHandler(async ({ params }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: params.id },
    include: { schedules: true, breaks: true },
  });
  if (!doctor) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  return jsonOk({ schedules: doctor.schedules, breaks: doctor.breaks });
});

export const PUT = apiHandler(async ({ req, params, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  assertDoctorOwn(user, params.id);
  const body = schedulesPutSchema.parse(await readJson(req));
  for (const s of body.schedules) {
    if (s.endMin <= s.startMin) throw new ApiError("VALIDATION_ERROR", "endMin must be after startMin", 400);
  }
  await prisma.$transaction(async (tx) => {
    await tx.doctorSchedule.deleteMany({ where: { doctorId: params.id } });
    await tx.scheduleBreak.deleteMany({ where: { doctorId: params.id } });
    if (body.schedules.length) {
      await tx.doctorSchedule.createMany({
        data: body.schedules.map((s) => ({ doctorId: params.id, ...s })),
      });
    }
    if (body.breaks?.length) {
      await tx.scheduleBreak.createMany({
        data: body.breaks.map((s) => ({
          doctorId: params.id,
          weekday: s.weekday,
          startMin: s.startMin,
          endMin: s.endMin,
          label: s.label,
        })),
      });
    }
  });
  const doctor = await prisma.doctor.findUnique({ where: { id: params.id } });
  if (doctor) {
    await notifyUser({
      userId: doctor.userId,
      type: "SCHEDULE_CHANGED",
      title: "Schedule updated",
      body: "Working hours or breaks were changed.",
      data: { doctorId: doctor.id },
    });
  }
  await writeAudit({
    actorId: user.id,
    action: "SCHEDULE_UPDATED",
    entity: "Doctor",
    entityId: params.id,
  });
  const fresh = await prisma.doctor.findUnique({
    where: { id: params.id },
    include: { schedules: true, breaks: true },
  });
  return jsonOk(fresh);
}, { auth: true, roles: [Role.ADMIN, Role.DOCTOR] });
