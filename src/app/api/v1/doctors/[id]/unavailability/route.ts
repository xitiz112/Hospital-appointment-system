import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { unavailabilitySchema } from "@/lib/validators";
import { assertDoctorOwn } from "@/lib/rbac";
import { notifyUser } from "@/lib/notifications";

export const GET = apiHandler(async ({ params }) => {
  const items = await prisma.doctorUnavailability.findMany({
    where: { doctorId: params.id },
    orderBy: { startAt: "desc" },
  });
  return jsonOk(items);
});

export const POST = apiHandler(async ({ req, params, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  assertDoctorOwn(user, params.id);
  const body = unavailabilitySchema.parse(await readJson(req));
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (!(startAt < endAt)) throw new ApiError("VALIDATION_ERROR", "endAt must be after startAt", 400);
  const item = await prisma.doctorUnavailability.create({
    data: { doctorId: params.id, startAt, endAt, reason: body.reason },
  });
  const doctor = await prisma.doctor.findUnique({ where: { id: params.id } });
  if (doctor) {
    await notifyUser({
      userId: doctor.userId,
      type: "SCHEDULE_CHANGED",
      title: "Unavailability added",
      body: body.reason ?? "A leave/unavailability window was added.",
      data: { doctorId: params.id },
    });
  }
  return jsonOk(item, undefined, 201);
}, { auth: true, roles: [Role.ADMIN, Role.DOCTOR] });

export const OPTIONS = POST;
