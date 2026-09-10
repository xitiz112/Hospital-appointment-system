import { AppointmentStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";

export const GET = apiHandler(async ({ user }) => {
  if (!user?.doctor) throw new ApiError("FORBIDDEN", "Doctor profile required", 403);
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [today, upcoming, unread] = await prisma.$transaction([
    prisma.appointment.findMany({
      where: {
        doctorId: user.doctor.id,
        startAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
      orderBy: { startAt: "asc" },
      include: { patient: { include: { user: { select: { name: true, phone: true } } } } },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId: user.doctor.id,
        startAt: { gt: endOfDay },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
      orderBy: { startAt: "asc" },
      take: 10,
      include: { patient: { include: { user: { select: { name: true } } } } },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return jsonOk({ today, upcoming, unreadNotifications: unread });
}, { auth: true, roles: [Role.DOCTOR] });
