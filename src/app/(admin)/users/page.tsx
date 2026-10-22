import Link from "next/link";
import { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityActions } from "@/components/admin/entity-actions";
import { UserStatusButton } from "@/components/admin/user-actions";
import { formatKtm, statusVariant } from "@/lib/format";

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrator", DOCTOR: "Doctor", PATIENT: "Patient" };

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = typeof sp.role === "string" && sp.role in Role ? (sp.role as Role) : undefined;
  const status = typeof sp.status === "string" && sp.status in UserStatus ? (sp.status as UserStatus) : undefined;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1));
  const pageSize = 50;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const pageHref = (p: number) =>
    `/users?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      page: String(p),
    }).toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users & permissions</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, deactivate, and delete accounts for administrators, doctors, and patients.
          </p>
        </div>
        <Button asChild>
          <Link href="/users/new">Add user</Link>
        </Button>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, phone"
          className="h-9 min-w-56 flex-1 rounded-md border bg-white px-3 text-sm sm:max-w-sm"
        />
        <select name="role" defaultValue={role ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">All roles</option>
          <option value="ADMIN">Administrators</option>
          <option value="DOCTOR">Doctors</option>
          <option value="PATIENT">Patients</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {q || role || status ? (
          <Button asChild variant="ghost">
            <Link href="/users">Clear</Link>
          </Button>
        ) : null}
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                No users match these filters.
              </TableCell>
            </TableRow>
          ) : null}
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <Link href={`/users/${u.id}`} className="font-medium text-primary hover:underline">
                  {u.name}
                </Link>
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.phone}</TableCell>
              <TableCell>{ROLE_LABEL[u.role]}</TableCell>
              <TableCell>{formatKtm(u.createdAt, "yyyy-MM-dd")}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-2">
                  <EntityActions
                    label="user"
                    editHref={`/users/${u.id}`}
                    deleteUrl={`/api/v1/admin/users/${u.id}`}
                    redirectTo="/users"
                  />
                  <UserStatusButton id={u.id} status={u.status} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} user{total === 1 ? "" : "s"} · page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>Previous</Link>
            </Button>
          ) : null}
          {page * pageSize < total ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>Next</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
