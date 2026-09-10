import { AppointmentStatus, PaymentStatus, UserStatus } from "@prisma/client";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const now = new Date();
  const [
    patients,
    doctors,
    todayAppointments,
    upcoming,
    cancelled,
    revenue,
  ] = await prisma.$transaction([
    prisma.patient.count({ where: { user: { status: UserStatus.ACTIVE } } }),
    prisma.doctor.count({ where: { user: { status: UserStatus.ACTIVE } } }),
    prisma.appointment.count({
      where: {
        startAt: { gte: startOfDay(now), lte: endOfDay(now) },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
    }),
    prisma.appointment.count({
      where: {
        startAt: { gt: endOfDay(now), lte: addDays(endOfDay(now), 7) },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
    }),
    prisma.appointment.count({ where: { status: AppointmentStatus.CANCELLED } }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCESS },
      _sum: { amount: true },
    }),
  ]);

  const stats = [
    { label: "Active patients", value: patients },
    { label: "Active doctors", value: doctors },
    { label: "Today's appointments", value: todayAppointments },
    { label: "Upcoming (7 days)", value: upcoming },
    { label: "Cancelled (all)", value: cancelled },
    { label: "Revenue (NPR)", value: Number(revenue._sum.amount ?? 0).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Kathmandu General Hospital operations overview</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
