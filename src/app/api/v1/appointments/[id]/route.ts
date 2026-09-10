import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { scopedAppointmentWhere } from "@/lib/rbac";

export const GET = apiHandler(async ({ params, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const appointment = await prisma.appointment.findFirst({
    where: { id: params.id, ...scopedAppointmentWhere(user) },
    include: {
      doctor: { include: { user: { select: { name: true, imageUrl: true } }, department: true, specialization: true } },
      patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
      payments: true,
      cancellation: true,
      hospital: true,
    },
  });
  if (!appointment) throw new ApiError("NOT_FOUND", "Appointment not found", 404);
  return jsonOk(appointment);
}, { auth: true });
