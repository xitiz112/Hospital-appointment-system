import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateDepartmentForm, ToggleDepartment } from "@/components/admin/department-actions";

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { doctors: true, specializations: true } } },
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
                <TableHead>Specializations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/departments/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </TableCell>
                  <TableCell>{d._count.doctors}</TableCell>
                  <TableCell>{d._count.specializations}</TableCell>
                  <TableCell>
                    <Badge variant={d.isActive ? "success" : "danger"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/departments/${d.id}`}>Edit</Link>
                      </Button>
                      <ToggleDepartment id={d.id} isActive={d.isActive} />
                    </div>
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
