import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { scopedAppointmentWhere } from "@/lib/rbac";

export const GET = apiHandler(async ({ params, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      appointment: {
        include: {
          patient: { include: { user: { select: { name: true, email: true } } } },
          doctor: { include: { user: { select: { name: true } } } },
          hospital: true,
        },
      },
    },
  });
  if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);
  const allowed = await prisma.appointment.findFirst({
    where: { id: payment.appointmentId, ...scopedAppointmentWhere(user) },
  });
  if (!allowed && user.role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "You cannot view this payment", 403);
  }
  return jsonOk(payment);
}, { auth: true });
