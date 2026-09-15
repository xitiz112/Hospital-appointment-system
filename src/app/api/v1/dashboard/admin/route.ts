import { AppointmentStatus, PaymentStatus, Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";
import { startOfDay, endOfDay, addDays } from "date-fns";

export const GET = apiHandler(async () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    patients,
    doctors,
    todayAppointments,
    upcoming,
    cancelled,
    revenue,
    pendingPayments,
  ] = await prisma.$transaction([
    prisma.patient.count({ where: { user: { status: UserStatus.ACTIVE } } }),
    prisma.doctor.count({ where: { user: { status: UserStatus.ACTIVE } } }),
    prisma.appointment.count({
      where: {
        startAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
    }),
    prisma.appointment.count({
      where: {
        startAt: { gt: todayEnd, lte: addDays(todayEnd, 7) },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
    }),
    prisma.appointment.count({
      where: { status: AppointmentStatus.CANCELLED, startAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCESS },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.INITIATED, PaymentStatus.FAILED] } },
    }),
  ]);

  return jsonOk({
    patients,
    doctors,
    todayAppointments,
    upcoming,
    cancelledToday: cancelled,
    revenue: revenue._sum.amount ?? 0,
    pendingPayments,
  });
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = GET;
