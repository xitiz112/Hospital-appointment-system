import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { cancelAppointment } from "@/lib/appointments";
import { cancelAppointmentSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req, params, user }) => {
  const body = cancelAppointmentSchema.parse(await readJson(req).catch(() => ({})));
  const appointment = await cancelAppointment(user!, params.id, body.reason);
  return jsonOk(appointment);
}, { auth: true });
