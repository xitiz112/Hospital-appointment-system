import { AppointmentStatus, Role } from "@prisma/client";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { updateAppointmentStatus } from "@/lib/appointments";
import { statusSchema } from "@/lib/validators";

export const PATCH = apiHandler(async ({ req, params, user }) => {
  const body = statusSchema.parse(await readJson(req));
  const appointment = await updateAppointmentStatus(
    user!,
    params.id,
    body.status as AppointmentStatus,
  );
  return jsonOk(appointment);
}, { auth: true, roles: [Role.ADMIN, Role.DOCTOR] });

export const OPTIONS = PATCH;
