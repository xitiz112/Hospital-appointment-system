import { AppointmentStatus, PaymentStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { weekdayInZone } from "@/lib/slots";

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfLocalDay(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeek(d = new Date()) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export const GET = apiHandler(async ({ user }) => {
  if (!user?.doctor) throw new ApiError("FORBIDDEN", "Doctor profile required", 403);

  const doctorId = user.doctor.id;
  const now = new Date();
  const startOfDay = startOfLocalDay(now);
  const endOfDay = endOfLocalDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const todayWeekday = weekdayInZone(now);

  const patientInclude = {
    patient: { include: { user: { select: { name: true, phone: true, imageUrl: true } } } },
    payments: { select: { id: true, status: true, amount: true }, take: 1, orderBy: { createdAt: "desc" as const } },
  };

  const [
    todayAll,
    upcoming,
    unread,
    completedToday,
    noShowToday,
    cancelledToday,
    feesCollected,
    feesPending,
    weekAppointments,
    schedules,
  ] = await prisma.$transaction([
    prisma.appointment.findMany({
      where: {
        doctorId,
        startAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
      orderBy: { startAt: "asc" },
      include: patientInclude,
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        startAt: { gt: now },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
      orderBy: { startAt: "asc" },
      take: 10,
      include: patientInclude,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.appointment.count({
      where: { doctorId, startAt: { gte: startOfDay, lte: endOfDay }, status: AppointmentStatus.COMPLETED },
    }),
    prisma.appointment.count({
      where: { doctorId, startAt: { gte: startOfDay, lte: endOfDay }, status: AppointmentStatus.NO_SHOW },
    }),
    prisma.appointment.count({
      where: { doctorId, startAt: { gte: startOfDay, lte: endOfDay }, status: AppointmentStatus.CANCELLED },
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.SUCCESS,
        appointment: { doctorId, startAt: { gte: startOfDay, lte: endOfDay } },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.INITIATED] },
        appointment: { doctorId, startAt: { gte: startOfDay, lte: endOfDay } },
      },
      _sum: { amount: true },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: {
        doctorId,
        startAt: { gte: weekStart, lte: weekEnd },
        status: { notIn: [AppointmentStatus.RESCHEDULED] },
      },
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
      select: { weekday: true, startMin: true, endMin: true },
    }),
  ]);

  const confirmedToday = todayAll.filter((a) => a.status === AppointmentStatus.CONFIRMED).length;
  const pendingToday = todayAll.filter((a) => a.status === AppointmentStatus.PENDING).length;
  const nextPatients = todayAll.filter((a) => a.startAt >= now).slice(0, 3);

  const weekByStatus = Object.fromEntries(
    weekAppointments.map((row) => {
      const count = typeof row._count === "object" && row._count ? Number(row._count._all ?? 0) : 0;
      return [row.status, count];
    }),
  ) as Record<string, number>;

  return jsonOk({
    today: todayAll,
    upcoming,
    nextPatients,
    confirmedToday,
    pendingToday,
    completedToday,
    noShowToday,
    cancelledToday,
    feesCollectedToday: Number(feesCollected._sum.amount ?? 0),
    feesPendingToday: Number(feesPending._sum.amount ?? 0),
    unreadNotifications: unread,
    unreadCount: unread,
    week: {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      booked: Object.values(weekByStatus).reduce((a, b) => a + b, 0),
      completed: weekByStatus.COMPLETED ?? 0,
      cancelled: weekByStatus.CANCELLED ?? 0,
      pending: weekByStatus.PENDING ?? 0,
      confirmed: weekByStatus.CONFIRMED ?? 0,
    },
    scheduleToday: schedules.filter((s) => s.weekday === todayWeekday),
    schedules,
  });
}, { auth: true, roles: [Role.DOCTOR] });

export const OPTIONS = GET;
