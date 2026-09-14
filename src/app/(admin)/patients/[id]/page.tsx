import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { PatientForm } from "@/components/admin/patient-form";
import { PatientStatusButton } from "@/components/admin/patient-status";
import { formatKtm, statusVariant } from "@/lib/format";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      user: true,
      appointments: {
        orderBy: { startAt: "desc" },
        take: 30,
        include: { doctor: { include: { user: true } } },
      },
    },
  });
  if (!patient) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{patient.user.name}</h1>
          <p className="text-sm text-muted-foreground">{patient.user.email}</p>
        </div>
        <PatientStatusButton id={patient.id} status={patient.user.status} />
      </div>
      <PatientForm
        patient={{
          id: patient.id,
          name: patient.user.name,
          email: patient.user.email,
          phone: patient.user.phone,
          dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : null,
          gender: patient.gender,
          address: patient.address,
          notifyEmail: patient.notifyEmail,
          notifyPush: patient.notifyPush,
          notifySms: patient.notifySms,
        }}
      />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Appointment history</h2>
        <ul className="space-y-2 text-sm">
          {patient.appointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <Link href={`/appointments/${a.id}`} className="text-primary hover:underline">
                {formatKtm(a.startAt)} · {a.doctor.user.name}
              </Link>
              <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
