import { AppointmentStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";

export const GET = apiHandler(async ({ user }) => {
  if (!user?.patient) throw new ApiError("FORBIDDEN", "Patient profile required", 403);
  const now = new Date();
  const [upcoming, past, unread] = await prisma.$transaction([
    prisma.appointment.findMany({
      where: {
        patientId: user.patient.id,
        startAt: { gte: now },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
      orderBy: { startAt: "asc" },
      take: 10,
      include: { doctor: { include: { user: { select: { name: true, imageUrl: true } } } }, payments: true },
    }),
    prisma.appointment.findMany({
      where: { patientId: user.patient.id, startAt: { lt: now } },
      orderBy: { startAt: "desc" },
      take: 10,
      include: { doctor: { include: { user: { select: { name: true } } } } },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return jsonOk({ upcoming, past, unreadNotifications: unread });
}, { auth: true, roles: [Role.PATIENT] });

export const OPTIONS = GET;
