import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { initiatePayment } from "@/lib/payments/service";
import { initiatePaymentSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req, user }) => {
  const body = initiatePaymentSchema.parse(await readJson(req));
  const result = await initiatePayment(user!, body.appointmentId, body.provider);
  return jsonOk(result);
}, { auth: true });

export const OPTIONS = POST;
