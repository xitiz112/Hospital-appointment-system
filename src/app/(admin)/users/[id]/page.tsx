import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteEntityButton } from "@/components/admin/entity-actions";
import { UserForm } from "@/components/admin/user-actions";
import { formatKtm, statusVariant } from "@/lib/format";

const ROLE_LABEL = { ADMIN: "Administrator", DOCTOR: "Doctor", PATIENT: "Patient" } as const;

export default async function EditUserPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  const [session, user] = await Promise.all([
    auth(),
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        patient: { select: { id: true, _count: { select: { appointments: true } } } },
        doctor: { select: { id: true, _count: { select: { appointments: true } } } },
      },
    }),
  ]);
  if (!user) notFound();

  const isSelf = session?.user?.id === user.id;
  const profileHref = user.patient
    ? `/patients/${user.patient.id}`
    : user.doctor
      ? `/doctors/${user.doctor.id}`
      : null;
  const appointments = (user.patient?._count.appointments ?? 0) + (user.doctor?._count.appointments ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/users" className="text-sm text-muted-foreground hover:text-primary">
            ← Users
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{user.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{ROLE_LABEL[user.role]}</span>
            <span>·</span>
            <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
            <span>·</span>
            <span>Joined {formatKtm(user.createdAt, "d MMM yyyy")}</span>
            {user.role !== "ADMIN" ? (
              <>
                <span>·</span>
                <span>
                  {appointments} appointment{appointments === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {isSelf ? null : <DeleteEntityButton label="user" deleteUrl={`/api/v1/admin/users/${user.id}`} redirectTo="/users" />}
      </div>

      {profileHref ? (
        <p className="text-sm text-muted-foreground">
          {user.role === "DOCTOR" ? "Department, fee, and schedule" : "Date of birth, address, and preferences"} are on
          the{" "}
          <Link href={profileHref} className="font-medium text-primary hover:underline">
            {user.role === "DOCTOR" ? "doctor" : "patient"} profile
          </Link>
          .
        </p>
      ) : null}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
