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
          patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
          doctor: { include: { user: { select: { name: true } }, department: true } },
          hospital: true,
        },
      },
    },
  });
  if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);
  if (!payment.receiptNumber) {
    throw new ApiError("NOT_PAID", "Receipt is available after a successful payment", 400);
  }
  const allowed = await prisma.appointment.findFirst({
    where: { id: payment.appointmentId, ...scopedAppointmentWhere(user) },
  });
  if (!allowed && user.role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "You cannot view this receipt", 403);
  }
  return jsonOk({
    receiptNumber: payment.receiptNumber,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    paidAt: payment.paidAt,
    hospital: payment.appointment.hospital.name,
    patient: payment.appointment.patient.user.name,
    doctor: payment.appointment.doctor.user.name,
    department: payment.appointment.doctor.department.name,
    appointmentStart: payment.appointment.startAt,
  });
}, { auth: true });
