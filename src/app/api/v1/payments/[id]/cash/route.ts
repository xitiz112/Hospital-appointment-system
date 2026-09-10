import { Role } from "@prisma/client";
import { apiHandler, jsonOk } from "@/lib/api";
import { markCashPaid } from "@/lib/payments/service";

export const POST = apiHandler(async ({ params, user }) => {
  const payment = await markCashPaid(user!, params.id);
  return jsonOk(payment);
}, { auth: true, roles: [Role.ADMIN] });
