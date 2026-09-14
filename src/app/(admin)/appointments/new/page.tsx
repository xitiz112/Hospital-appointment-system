import { prisma } from "@/lib/prisma";
import { BookAppointmentForm } from "@/components/admin/book-appointment-form";

export default async function NewAppointmentPage() {
  const [doctors, patients] = await Promise.all([
    prisma.doctor.findMany({
      where: { isAvailable: true, user: { status: "ACTIVE" } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.patient.findMany({
      where: { user: { status: "ACTIVE" } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Book appointment</h1>
        <p className="text-sm text-muted-foreground">Select a patient, doctor, date, and generated time slot</p>
      </div>
      <BookAppointmentForm
        doctors={doctors.map((d) => ({ id: d.id, name: d.user.name }))}
        patients={patients.map((p) => ({ id: p.id, name: p.user.name }))}
      />
    </div>
  );
}
