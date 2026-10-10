"use client";

import Link from "next/link";
import { ArrowRight, Bell, CalendarPlus, Clock, CreditCard, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKtm } from "@/lib/format";
import { formatNpr, needsPayment, type Appointment, type Department } from "@/lib/patient-types";
import { usePatientSession } from "@/components/patient/session";
import { AppointmentRow } from "@/components/patient/appointment-row";
import { Avatar, Empty, ErrorNote, Loading, Panel, StatusBadge, useApi } from "@/components/patient/ui";

type PatientDashboard = { upcoming: Appointment[]; past: Appointment[]; unreadNotifications: number };

function greeting() {
  const hour = Number(formatKtm(new Date(), "H"));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function PatientHomePage() {
  const { user, hospital } = usePatientSession();
  const dashboard = useApi<PatientDashboard>("/api/v1/dashboard/patient");
  const departments = useApi<Department[]>("/api/v1/departments");

  const upcoming = dashboard.data?.upcoming ?? [];
  const next = upcoming[0];
  const unpaid = upcoming.filter(needsPayment);
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{firstName}</h1>
        </div>
        <Button asChild size="lg">
          <Link href="/portal/doctors">
            <CalendarPlus className="h-4 w-4" />
            Book an appointment
          </Link>
        </Button>
      </div>

      {dashboard.error ? <ErrorNote message={dashboard.error} onRetry={dashboard.reload} /> : null}

      {unpaid.length ? (
        <Link
          href={`/portal/appointments/${unpaid[0].id}`}
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 hover:bg-amber-100/70"
        >
          <CreditCard className="h-5 w-5 shrink-0 text-amber-700" />
          <span className="flex-1">
            {unpaid.length === 1
              ? "One booking is waiting for payment. Pay to confirm your slot."
              : `${unpaid.length} bookings are waiting for payment. Pay to confirm your slots.`}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel className="bg-primary text-primary-foreground">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
              Next visit
            </p>
            {dashboard.loading ? (
              <p className="mt-4 text-sm text-primary-foreground/80">Loading…</p>
            ) : next ? (
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar
                  name={next.doctor.user.name}
                  src={next.doctor.user.imageUrl}
                  className="h-14 w-14 bg-white/15 text-primary-foreground"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xl font-semibold">{next.doctor.user.name}</p>
                  <p className="text-sm text-primary-foreground/80">{next.doctor.department.name}</p>
                  <p className="flex items-center gap-1.5 pt-1 text-sm">
                    <Clock className="h-4 w-4" />
                    {formatKtm(next.startAt, "EEEE, d MMMM · h:mm a")}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusBadge status={next.status} />
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/portal/appointments/${next.id}`}>View details</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-lg font-semibold">No upcoming visits</p>
                <p className="text-sm text-primary-foreground/80">
                  Find a doctor and pick a time that works for you.
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/portal/doctors">Find a doctor</Link>
                </Button>
              </div>
            )}
          </Panel>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Upcoming</h2>
              <Link href="/portal/appointments" className="text-sm font-medium text-accent hover:underline">
                All appointments
              </Link>
            </div>
            {dashboard.loading ? (
              <Loading />
            ) : upcoming.length > 1 ? (
              <div className="space-y-2">
                {upcoming.slice(1).map((a) => (
                  <AppointmentRow key={a.id} appointment={a} />
                ))}
              </div>
            ) : (
              <Empty title={next ? "Nothing else scheduled" : "Nothing scheduled yet"} />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Recent visits</h2>
            {dashboard.loading ? (
              <Loading />
            ) : dashboard.data?.past.length ? (
              <div className="space-y-2">
                {dashboard.data.past.slice(0, 5).map((a) => (
                  <AppointmentRow key={a.id} appointment={a} />
                ))}
              </div>
            ) : (
              <Empty title="No past visits yet" />
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Link
            href="/portal/notifications"
            className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm hover:border-accent/50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Notifications</span>
              <span className="block text-xs text-muted-foreground">
                {dashboard.data?.unreadNotifications
                  ? `${dashboard.data.unreadNotifications} unread`
                  : "You're all caught up"}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Panel>
            <h2 className="text-sm font-semibold">Browse by department</h2>
            {departments.loading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {(departments.data ?? []).map((d) => (
                  <Link
                    key={d.id}
                    href={`/portal/doctors?departmentId=${d.id}`}
                    className="rounded-full border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:bg-secondary"
                  >
                    {d.name}
                    {d._count ? <span className="ml-1.5 text-muted-foreground">{d._count.doctors}</span> : null}
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {hospital ? (
            <Panel className="space-y-3 text-sm">
              <h2 className="font-semibold">{hospital.name}</h2>
              {hospital.address ? (
                <p className="flex gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {hospital.address}
                </p>
              ) : null}
              {hospital.phone ? <p className="text-muted-foreground">Phone: {hospital.phone}</p> : null}
              <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">
                Cancel or reschedule at least {hospital.cancellationHours} hours before your visit.
                {hospital.paymentRequired
                  ? " Paid consultations are confirmed once payment succeeds."
                  : ""}
              </p>
            </Panel>
          ) : null}

          {next && Number(next.doctor.consultationFee) > 0 ? (
            <p className="px-1 text-xs text-muted-foreground">
              Next visit fee: {formatNpr(next.doctor.consultationFee)}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
