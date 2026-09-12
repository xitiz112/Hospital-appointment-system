import { AppointmentStatus, PaymentStatus, UserStatus } from "@prisma/client";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Stethoscope, CalendarCheck, CalendarClock, CalendarX, DollarSign, TrendingUp, Activity } from "lucide-react";

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
    {
      label: "Active Patients",
      value: patients,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      iconBg: "bg-blue-500",
      shadowColor: "shadow-blue-500/20",
    },
    {
      label: "Active Doctors",
      value: doctors,
      icon: Stethoscope,
      gradient: "from-teal-500 to-teal-600",
      bgGradient: "from-teal-50 to-teal-100",
      iconBg: "bg-teal-500",
      shadowColor: "shadow-teal-500/20",
    },
    {
      label: "Today's Appointments",
      value: todayAppointments,
      icon: CalendarCheck,
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100",
      iconBg: "bg-green-500",
      shadowColor: "shadow-green-500/20",
    },
    {
      label: "Upcoming (7 days)",
      value: upcoming,
      icon: CalendarClock,
      gradient: "from-amber-500 to-amber-600",
      bgGradient: "from-amber-50 to-amber-100",
      iconBg: "bg-amber-500",
      shadowColor: "shadow-amber-500/20",
    },
    {
      label: "Cancelled (all)",
      value: cancelled,
      icon: CalendarX,
      gradient: "from-red-500 to-red-600",
      bgGradient: "from-red-50 to-red-100",
      iconBg: "bg-red-500",
      shadowColor: "shadow-red-500/20",
    },
    {
      label: "Revenue (NPR)",
      value: Number(revenue._sum.amount ?? 0).toLocaleString(),
      icon: DollarSign,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100",
      iconBg: "bg-purple-500",
      shadowColor: "shadow-purple-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Kathmandu General Hospital operations overview</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 px-4 py-2 shadow-sm">
          <TrendingUp className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-medium text-teal-900">Real-time Analytics</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`overflow-hidden border-0 bg-gradient-to-br ${stat.bgGradient} shadow-lg ${stat.shadowColor} transition-all hover:shadow-xl hover:${stat.shadowColor.replace('/20', '/30')}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">{stat.label}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg} shadow-lg ${stat.shadowColor}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300">
            <Activity className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">System Status</h3>
            <p className="text-sm text-slate-600">All services operational • Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
