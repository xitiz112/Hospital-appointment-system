import { AppointmentStatus, PaymentStatus } from "@prisma/client";
import { addDays, subMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { HOSPITAL_TZ } from "@/lib/serialize";

export interface DayPoint {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
}

export interface MonthPoint {
  key: string;
  label: string;
  amount: number;
}

export interface BarItem {
  label: string;
  value: number;
  /** Optional pre-formatted value shown beside the bar. */
  display?: string;
}

const PAST_DAYS = 30;
const FUTURE_DAYS = 7;
const MONTHS = 6;

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

const PROVIDER_LABEL: Record<string, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Cash",
};

const dayKey = (d: Date) => formatInTimeZone(d, HOSPITAL_TZ, "yyyy-MM-dd");
const monthKey = (d: Date) => formatInTimeZone(d, HOSPITAL_TZ, "yyyy-MM");

/** Aggregates for the admin dashboard charts. Kept to a few queries for the remote DB. */
export async function getDashboardInsights(now = new Date()) {
  const rangeStart = addDays(now, -(PAST_DAYS + 1));
  const rangeEnd = addDays(now, FUTURE_DAYS + 1);
  const revenueStart = subMonths(now, MONTHS);

  const [windowAppts, statusGroups, doctorGroups, doctors, payments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startAt: { gte: rangeStart, lte: rangeEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
      select: { startAt: true },
    }),
    prisma.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.appointment.groupBy({
      by: ["doctorId"],
      where: { status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] } },
      _count: { _all: true },
    }),
    prisma.doctor.findMany({
      select: { id: true, user: { select: { name: true } }, department: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCESS,
        OR: [{ paidAt: { gte: revenueStart } }, { paidAt: null, createdAt: { gte: revenueStart } }],
      },
      select: { amount: true, provider: true, paidAt: true, createdAt: true },
    }),
  ]);

  // Visits per day: last 30 days through the next 7, in hospital time.
  const today = dayKey(now);
  const perDay = new Map<string, number>();
  for (const a of windowAppts) {
    const k = dayKey(a.startAt);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const visitsByDay: DayPoint[] = [];
  for (let i = -PAST_DAYS + 1; i <= FUTURE_DAYS; i++) {
    const d = addDays(now, i);
    const key = dayKey(d);
    visitsByDay.push({
      key,
      label: formatInTimeZone(d, HOSPITAL_TZ, "d MMM"),
      count: perDay.get(key) ?? 0,
      isToday: key === today,
    });
  }

  // Revenue per month (successful payments), last 6 months including this one.
  const perMonth = new Map<string, number>();
  const perProvider = new Map<string, number>();
  for (const p of payments) {
    const amount = Number(p.amount);
    const k = monthKey(p.paidAt ?? p.createdAt);
    perMonth.set(k, (perMonth.get(k) ?? 0) + amount);
    perProvider.set(p.provider, (perProvider.get(p.provider) ?? 0) + amount);
  }
  const revenueByMonth: MonthPoint[] = [];
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = monthKey(d);
    revenueByMonth.push({
      key,
      label: formatInTimeZone(d, HOSPITAL_TZ, "MMM yyyy"),
      amount: perMonth.get(key) ?? 0,
    });
  }

  const statusCounts = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const byStatus: BarItem[] = Object.values(AppointmentStatus).map((s) => ({
    label: STATUS_LABEL[s],
    value: statusCounts.get(s) ?? 0,
  }));

  const doctorById = new Map(doctors.map((d) => [d.id, d]));
  const perDepartment = new Map<string, number>();
  const perDoctor: BarItem[] = [];
  for (const g of doctorGroups) {
    const doc = doctorById.get(g.doctorId);
    if (!doc) continue;
    perDepartment.set(doc.department.name, (perDepartment.get(doc.department.name) ?? 0) + g._count._all);
    perDoctor.push({ label: doc.user.name, value: g._count._all });
  }
  const byDepartment = [...perDepartment]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const topDoctors = perDoctor.sort((a, b) => b.value - a.value).slice(0, 6);

  const byPaymentMethod: BarItem[] = [...perProvider]
    .map(([provider, value]) => ({
      label: PROVIDER_LABEL[provider] ?? provider,
      value,
      display: `NPR ${value.toLocaleString()}`,
    }))
    .sort((a, b) => b.value - a.value);

  return { visitsByDay, revenueByMonth, byStatus, byDepartment, topDoctors, byPaymentMethod };
}
