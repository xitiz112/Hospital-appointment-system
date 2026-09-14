import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditDepartmentForm } from "@/components/admin/department-edit";
import { ToggleDepartment } from "@/components/admin/department-actions";

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      doctors: { include: { user: true, specialization: true } },
      specializations: true,
    },
  });
  if (!department) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{department.name}</h1>
          <p className="text-sm text-muted-foreground">Edit department and view assigned doctors</p>
        </div>
        <ToggleDepartment id={department.id} isActive={department.isActive} />
      </div>
      <EditDepartmentForm id={department.id} name={department.name} description={department.description ?? ""} />
      <Card>
        <CardHeader>
          <CardTitle>Doctors in this department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {department.doctors.length === 0 ? <p className="text-sm text-muted-foreground">No doctors assigned.</p> : null}
          {department.doctors.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <Link href={`/doctors/${d.id}`} className="font-medium text-primary hover:underline">
                {d.user.name}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{d.specialization?.name}</span>
                <Badge variant={d.user.status === "ACTIVE" ? "success" : "danger"}>{d.user.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
