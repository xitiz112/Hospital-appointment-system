import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityActions } from "@/components/admin/entity-actions";
import { PatientStatusButton } from "@/components/admin/patient-status";
import { formatKtm } from "@/lib/format";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: { user: true, _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-sm text-muted-foreground">Create, edit, and delete patient accounts</p>
        </div>
        <Button asChild>
          <Link href="/patients/new">Add patient</Link>
        </Button>
      </div>
      <form className="flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, phone"
          className="h-9 flex-1 rounded-md border px-3 text-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Appointments</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link href={`/patients/${p.id}`} className="font-medium text-primary hover:underline">
                  {p.user.name}
                </Link>
              </TableCell>
              <TableCell>{p.user.email}</TableCell>
              <TableCell>{p.user.phone}</TableCell>
              <TableCell>{p._count.appointments}</TableCell>
              <TableCell>{formatKtm(p.createdAt, "yyyy-MM-dd")}</TableCell>
              <TableCell>
                <Badge variant={p.user.status === "ACTIVE" ? "success" : "danger"}>{p.user.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-2">
                  <EntityActions
                    label="patient"
                    editHref={`/patients/${p.id}`}
                    deleteUrl={`/api/v1/admin/patients/${p.id}`}
                    redirectTo="/patients"
                  />
                  <PatientStatusButton id={p.id} status={p.user.status} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
