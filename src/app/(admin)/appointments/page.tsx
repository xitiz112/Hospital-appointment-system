import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { hasSuccessfulPayment, requiresSuccessfulPayment } from "@/lib/appointments";
import { formatKtm, statusVariant } from "@/lib/format";

const STATUSES = ["ALL", ...Object.values(AppointmentStatus)];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; doctorId?: string; patientId?: string }>;
}) {
  const q = await searchParams;
  const status = q.status && q.status !== "ALL" ? (q.status as AppointmentStatus) : undefined;
  const [hospital, appointments, doctors, patients] = await Promise.all([
    prisma.hospital.findFirst(),
    prisma.appointment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q.doctorId ? { doctorId: q.doctorId } : {}),
        ...(q.patientId ? { patientId: q.patientId } : {}),
      },
      orderBy: { startAt: "desc" },
      take: 150,
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
        payments: { select: { status: true } },
      },
    }),
    prisma.doctor.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.patient.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);
  const paymentRequired = hospital?.paymentRequired ?? true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Filter, book, cancel, and reschedule. Confirmation happens after payment succeeds.
          </p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">Book appointment</Link>
        </Button>
      </div>
      <form className="flex flex-wrap gap-2">
        <select name="status" defaultValue={q.status ?? "ALL"} className="h-9 rounded-md border px-3 text-sm">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="doctorId" defaultValue={q.doctorId ?? ""} className="h-9 rounded-md border px-3 text-sm">
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.user.name}
            </option>
          ))}
        </select>
        <select name="patientId" defaultValue={q.patientId ?? ""} className="h-9 rounded-md border px-3 text-sm">
          <option value="">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.user.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When (KTM)</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Link href={`/appointments/${a.id}`} className="text-primary hover:underline">
                  {formatKtm(a.startAt)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/patients/${a.patientId}`} className="hover:underline">
                  {a.patient.user.name}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/doctors/${a.doctorId}`} className="hover:underline">
                  {a.doctor.user.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
              </TableCell>
              <TableCell>
                <AppointmentActions
                  id={a.id}
                  status={a.status}
                  awaitingPayment={
                    requiresSuccessfulPayment(paymentRequired, a.doctor.consultationFee) &&
                    !hasSuccessfulPayment(a.payments)
                  }
                  canConfirm={
                    !requiresSuccessfulPayment(paymentRequired, a.doctor.consultationFee) ||
                    hasSuccessfulPayment(a.payments)
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
