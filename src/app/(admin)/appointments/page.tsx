import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { formatKtm, statusVariant } from "@/lib/format";

export default async function AppointmentsPage() {
  const appointments = await prisma.appointment.findMany({
    orderBy: { startAt: "desc" },
    take: 100,
    include: {
      doctor: { include: { user: true } },
      patient: { include: { user: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <p className="text-sm text-muted-foreground">Filter, cancel, and update visit status</p>
      </div>
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
              <TableCell>{formatKtm(a.startAt)}</TableCell>
              <TableCell>{a.patient.user.name}</TableCell>
              <TableCell>{a.doctor.user.name}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
              </TableCell>
              <TableCell>
                <AppointmentActions id={a.id} status={a.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
