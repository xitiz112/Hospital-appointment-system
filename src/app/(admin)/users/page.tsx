import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateAdminForm, UserStatusButton } from "@/components/admin/user-actions";
import { formatKtm, statusVariant } from "@/lib/format";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { patient: { select: { id: true } }, doctor: { select: { id: true } } },
  });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Users & permissions</h1>
        <p className="text-sm text-muted-foreground">
          Roles are Patient, Doctor, and Administrator. Create extra admins here; doctors and patients are created on their own pages.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add administrator</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateAdminForm />
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{formatKtm(u.createdAt, "yyyy-MM-dd")}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <UserStatusButton id={u.id} status={u.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
