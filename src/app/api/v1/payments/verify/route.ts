import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { verifyPayment } from "@/lib/payments/service";
import { scopedAppointmentWhere } from "@/lib/rbac";
import { verifyPaymentSchema } from "@/lib/validators";

// Gateway redirects are handled by /payments/esewa/success and /payments/khalti/return;
// this endpoint is for signed-in clients (the mobile app) to re-check a payment.
export const POST = apiHandler(async ({ req, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const body = verifyPaymentSchema.parse(await readJson(req));

  const ref = body.transactionUuid ?? body.pidx;
  if (!body.appointmentId && !ref) {
    throw new ApiError("VALIDATION_ERROR", "appointmentId, transactionUuid or pidx is required", 400);
  }
  if (user.role !== Role.ADMIN) {
    const payment = await prisma.payment.findFirst({
      where: {
        ...(body.appointmentId ? { appointmentId: body.appointmentId } : {}),
        ...(ref ? { gatewayRef: ref } : {}),
        appointment: scopedAppointmentWhere(user),
      },
      select: { id: true },
    });
    if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);
  }

  const result = await verifyPayment(body);
  return jsonOk(result);
}, { auth: true });

export const OPTIONS = POST;
