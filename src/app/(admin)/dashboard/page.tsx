import Link from "next/link";
import {
  AppointmentStatus,
  PaymentStatus,
  UserStatus,
} from "@prisma/client";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  Stethoscope,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getHospitalCached } from "@/lib/admin-queries";
import { Badge } from "@/components/ui/badge";
import { formatKtm, statusVariant } from "@/lib/format";
import { HOSPITAL_TZ } from "@/lib/serialize";
import { cn } from "@/lib/utils";

const featuredMeta = [
  {
    label: "Today’s appointments",
    href: "/appointments",
    icon: CalendarDays,
    tone: "forest" as const,
  },
  {
    label: "Upcoming (7 days)",
    href: "/appointments",
    icon: CalendarPlus,
    tone: "sand" as const,
  },
];

const compactMeta = [
  { label: "Active patients", href: "/patients", icon: Users, tone: "paper" as const },
  { label: "Active doctors", href: "/doctors", icon: Stethoscope, tone: "ink" as const },
  { label: "Cancelled (all)", href: "/appointments?status=CANCELLED", icon: XCircle, tone: "quiet" as const },
  { label: "Revenue (NPR)", href: "/payments", icon: CircleDollarSign, tone: "ochre" as const },
  { label: "Pending payments", href: "/payments", icon: Wallet, tone: "line" as const },
];

const toneClass = {
  forest: "bg-[#1B4F72] text-white border-transparent",
  sand: "bg-[#2E86AB] text-white border-transparent",
  paper: "bg-[#FFFFFF] text-[#1A2332] border-[#D0DCE8]",
  ink: "bg-[#1A2332] text-[#F5F8FB] border-transparent",
  quiet: "bg-[#E8F1F8] text-[#1A2332] border-transparent",
  ochre: "bg-[#C48A00] text-white border-transparent",
  line: "bg-transparent text-[#1A2332] border-[#1B4F72]",
};

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const apptListSelect = {
  id: true,
  startAt: true,
  status: true,
  patient: { select: { user: { select: { name: true } } } },
  doctor: { select: { user: { select: { name: true } } } },
} as const;

export default async function DashboardPage() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const [
    hospital,
    patients,
    doctors,
    todayAppointments,
    upcoming,
    cancelled,
    revenue,
    pendingPayments,
    todayList,
    recent,
  ] = await Promise.all([
    getHospitalCached(),
    prisma.patient.count({ where: { user: { status: UserStatus.ACTIVE } } }),
    prisma.doctor.count({ where: { user: { status: UserStatus.ACTIVE } } }),
    prisma.appointment.count({
      where: {
        startAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
    }),
    prisma.appointment.count({
      where: {
        startAt: { gt: dayEnd, lte: addDays(dayEnd, 7) },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
    }),
    prisma.appointment.count({ where: { status: AppointmentStatus.CANCELLED } }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCESS },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.INITIATED] } },
    }),
    prisma.appointment.findMany({
      where: {
        startAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
      },
      orderBy: { startAt: "asc" },
      take: 8,
      select: apptListSelect,
    }),
    prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: apptListSelect,
    }),
  ]);

  const featuredValues = [todayAppointments, upcoming];
  const compactValues = [
    patients,
    doctors,
    cancelled,
    Number(revenue._sum.amount ?? 0).toLocaleString(),
    pendingPayments,
  ];

  const todayLabel = formatInTimeZone(now, HOSPITAL_TZ, "EEEE, d MMMM yyyy");
  const hour = Number(formatInTimeZone(now, HOSPITAL_TZ, "H"));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[#D0DCE8] bg-[#E8F1F8] px-6 py-7 sm:px-8">
        <div className="clinic-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2E86AB]">
              {todayLabel}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1A2332] sm:text-4xl">
              {greetingForHour(hour)}
            </h1>
            <p className="text-sm leading-6 text-[#5A6B7D]">
              {hospital?.name ?? "Hospital"} — today’s visits, pending payments, and recent bookings.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { href: "/appointments/new", label: "Book visit" },
                { href: "/doctors/new", label: "Add doctor" },
                { href: "/patients/new", label: "Add patient" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="clinic-focus inline-flex items-center gap-1 rounded-full border border-[#1B4F72] px-4 py-2 text-sm font-medium text-[#1B4F72] transition hover:bg-[#1B4F72] hover:text-white"
                >
                  {action.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-6 border-t border-[#D0DCE8] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5A6B7D]">
                On the board
              </dt>
              <dd className="mt-1 text-4xl font-semibold tracking-tight text-[#1B4F72]">
                {todayAppointments}
              </dd>
              <p className="mt-1 text-xs text-[#5A6B7D]">visits today</p>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5A6B7D]">
                Ledger
              </dt>
              <dd className="mt-1 text-4xl font-semibold tracking-tight text-[#1A2332]">
                {pendingPayments}
              </dd>
              <p className="mt-1 text-xs text-[#5A6B7D]">pending payments</p>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {featuredMeta.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="clinic-focus group rounded-2xl">
              <article
                className={cn(
                  "flex h-full items-end justify-between rounded-2xl border p-6 transition group-hover:-translate-y-0.5",
                  toneClass[stat.tone],
                )}
              >
                <div>
                  <p className="text-sm/6 opacity-80">{stat.label}</p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight">{featuredValues[index]}</p>
                </div>
                <Icon className="h-6 w-6 opacity-70" />
              </article>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {compactMeta.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="clinic-focus group rounded-xl">
              <article
                className={cn(
                  "h-full rounded-xl border px-4 py-4 transition group-hover:-translate-y-0.5",
                  toneClass[stat.tone],
                )}
              >
                <Icon className="mb-5 h-4 w-4 opacity-70" />
                <p className="text-2xl font-semibold tracking-tight">{compactValues[index]}</p>
                <p className="mt-1 text-xs leading-5 opacity-80">{stat.label}</p>
              </article>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#D0DCE8] bg-[#FFFFFF] p-6">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Today’s clinic</h2>
              <p className="text-sm text-[#5A6B7D]">Visits scheduled for today</p>
            </div>
            <Link
              href="/appointments"
              className="clinic-focus text-sm font-medium text-[#1B4F72] underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>
          {todayList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D0DCE8] bg-[#F5F8FB] px-5 py-12 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F1F8] text-[#1B4F72]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-[#1A2332]">The board is clear</p>
              <p className="mt-1 text-sm text-[#5A6B7D]">No visits on the board today.</p>
              <Link
                href="/appointments/new"
                className="clinic-focus mt-4 inline-flex text-sm font-medium text-[#1B4F72] underline-offset-4 hover:underline"
              >
                Book a visit
              </Link>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {todayList.map((a, i) => (
                <li key={a.id} className="relative grid grid-cols-[3.25rem_1fr] gap-3">
                  <div className="relative flex flex-col items-end pt-3">
                    <time className="text-xs font-semibold tabular-nums text-[#2E86AB]">
                      {formatKtm(a.startAt, "HH:mm")}
                    </time>
                    {i < todayList.length - 1 ? (
                      <span className="absolute bottom-0 right-[0.45rem] top-8 w-px bg-[#D0DCE8]" />
                    ) : null}
                  </div>
                  <Link
                    href={`/appointments/${a.id}`}
                    className="clinic-focus mb-2 flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-[#D0DCE8] hover:bg-[#F5F8FB]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.patient.user.name}</p>
                      <p className="truncate text-sm text-[#5A6B7D]">{a.doctor.user.name}</p>
                    </div>
                    <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="rounded-2xl border border-[#D0DCE8] bg-[#FFFFFF] p-6">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Recent bookings</h2>
              <p className="text-sm text-[#5A6B7D]">Latest appointments created</p>
            </div>
            <Link
              href="/appointments/new"
              className="clinic-focus text-sm font-medium text-[#1B4F72] underline-offset-4 hover:underline"
            >
              Book now
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D0DCE8] bg-[#F5F8FB] px-5 py-12 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F1F8] text-[#1B4F72]">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-[#1A2332]">Nothing booked yet</p>
              <p className="mt-1 text-sm text-[#5A6B7D]">New visits will appear here as they are created.</p>
              <Link
                href="/appointments/new"
                className="clinic-focus mt-4 inline-flex text-sm font-medium text-[#1B4F72] underline-offset-4 hover:underline"
              >
                Book a visit
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/appointments/${a.id}`}
                    className="clinic-focus flex items-start gap-3 rounded-xl px-2 py-3 transition hover:bg-[#F5F8FB]"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1B4F72]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-medium">{a.patient.user.name}</p>
                        <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-[#5A6B7D]">
                        {formatKtm(a.startAt)} · {a.doctor.user.name}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
