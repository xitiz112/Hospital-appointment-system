import { AppointmentStatus, PaymentStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";
import { subDays, format } from "date-fns";

export const GET = apiHandler(async ({ req }) => {
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("days") ?? 14)));
  const from = subDays(new Date(), days);

  const appointments = await prisma.appointment.findMany({
    where: { createdAt: { gte: from } },
    select: { status: true, startAt: true, createdAt: true },
  });
  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.SUCCESS, paidAt: { gte: from } },
    select: { amount: true, paidAt: true, provider: true },
  });

  const byStatus: Record<string, number> = {};
  for (const s of Object.values(AppointmentStatus)) byStatus[s] = 0;
  const byDay: Record<string, { appointments: number; revenue: number }> = {};

  for (const a of appointments) {
    byStatus[a.status] += 1;
    const key = format(a.startAt, "yyyy-MM-dd");
    byDay[key] ??= { appointments: 0, revenue: 0 };
    byDay[key].appointments += 1;
  }
  for (const p of payments) {
    const key = format(p.paidAt ?? new Date(), "yyyy-MM-dd");
    byDay[key] ??= { appointments: 0, revenue: 0 };
    byDay[key].revenue += Number(p.amount);
  }

  const revenueByProvider: Record<string, number> = {};
  for (const p of payments) {
    revenueByProvider[p.provider] = (revenueByProvider[p.provider] ?? 0) + Number(p.amount);
  }

  return jsonOk({
    days,
    byStatus,
    byDay: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
    revenueByProvider,
    totalRevenue: payments.reduce((s, p) => s + Number(p.amount), 0),
  });
}, { auth: true, roles: [Role.ADMIN] });
