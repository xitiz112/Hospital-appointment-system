import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { rescheduleAppointment } from "@/lib/appointments";
import { rescheduleSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req, params, user }) => {
  const body = rescheduleSchema.parse(await readJson(req));
  const appointment = await rescheduleAppointment(user!, params.id, new Date(body.startAt), body.reason);
  return jsonOk(appointment);
}, { auth: true });
