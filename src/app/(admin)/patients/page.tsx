import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PatientStatusButton } from "@/components/admin/patient-status";
import { formatKtm } from "@/lib/format";

export default async function PatientsPage() {
  const patients = await prisma.patient.findMany({
    include: { user: true, _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Patients</h1>
        <p className="text-sm text-muted-foreground">View accounts and activate or deactivate access</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Appointments</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.user.name}</TableCell>
              <TableCell>{p.user.email}</TableCell>
              <TableCell>{p.user.phone}</TableCell>
              <TableCell>{p._count.appointments}</TableCell>
              <TableCell>{formatKtm(p.createdAt, "yyyy-MM-dd")}</TableCell>
              <TableCell>
                <Badge variant={p.user.status === "ACTIVE" ? "success" : "danger"}>{p.user.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <PatientStatusButton id={p.id} status={p.user.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
