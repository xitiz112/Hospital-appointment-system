import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateDepartmentForm, ToggleDepartment } from "@/components/admin/department-actions";

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { doctors: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Departments</h1>
        <p className="text-sm text-muted-foreground">Create, edit, and activate hospital departments</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add department</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateDepartmentForm />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Doctors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </TableCell>
                  <TableCell>{d._count.doctors}</TableCell>
                  <TableCell>
                    <Badge variant={d.isActive ? "success" : "danger"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ToggleDepartment id={d.id} isActive={d.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
