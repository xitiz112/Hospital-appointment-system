import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityActions } from "@/components/admin/entity-actions";

export default async function DoctorsPage() {
  const doctors = await prisma.doctor.findMany({
    orderBy: { user: { name: "asc" } },
    take: 200,
    select: {
      id: true,
      consultationFee: true,
      appointmentDurationMin: true,
      isAvailable: true,
      user: { select: { name: true, status: true, imageUrl: true } },
      department: { select: { name: true } },
      specialization: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Doctors</h1>
          <p className="text-sm text-muted-foreground">Create, edit, and delete doctor profiles</p>
        </div>
        <Button asChild>
          <Link href="/doctors/new">Add doctor</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doctor</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Fee (NPR)</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {doctors.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    {d.user.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.user.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">N/A</span>
                    )}
                  </div>
                  <div>
                    <Link href={`/doctors/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.user.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{d.specialization?.name}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{d.department.name}</TableCell>
              <TableCell>{Number(d.consultationFee).toLocaleString()}</TableCell>
              <TableCell>{d.appointmentDurationMin} min</TableCell>
              <TableCell>
                <Badge variant={d.user.status === "ACTIVE" && d.isAvailable ? "success" : "danger"}>
                  {d.user.status === "INACTIVE" ? "Inactive" : d.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <EntityActions
                  label="doctor"
                  editHref={`/doctors/${d.id}`}
                  deleteUrl={`/api/v1/doctors/${d.id}`}
                  redirectTo="/doctors"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
