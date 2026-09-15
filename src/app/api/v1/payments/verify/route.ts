import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { verifyPayment } from "@/lib/payments/service";
import { verifyPaymentSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req }) => {
  const body = verifyPaymentSchema.parse(await readJson(req));
  const result = await verifyPayment(body);
  return jsonOk(result);
});

export const OPTIONS = POST;
