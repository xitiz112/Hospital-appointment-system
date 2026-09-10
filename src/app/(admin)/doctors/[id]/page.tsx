import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DoctorForm } from "@/components/admin/doctor-form";
import { ActivateDoctor } from "@/components/admin/activate-doctor";
import { minutesToHHmm } from "@/lib/serialize";

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doctor, departments, specializations] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id },
      include: { user: true, schedules: true, department: true },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.specialization.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!doctor) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{doctor.user.name}</h1>
          <p className="text-sm text-muted-foreground">{doctor.department.name}</p>
        </div>
        <ActivateDoctor id={doctor.id} active={doctor.user.status === "ACTIVE"} />
      </div>
      <DoctorForm
        departments={departments}
        specializations={specializations}
        doctor={{
          id: doctor.id,
          name: doctor.user.name,
          email: doctor.user.email,
          phone: doctor.user.phone,
          departmentId: doctor.departmentId,
          specializationId: doctor.specializationId,
          qualifications: doctor.qualifications,
          experienceYears: doctor.experienceYears,
          consultationFee: Number(doctor.consultationFee),
          appointmentDurationMin: doctor.appointmentDurationMin,
          location: doctor.location,
          bio: doctor.bio,
          isAvailable: doctor.isAvailable,
        }}
      />
      <div>
        <h2 className="mb-2 text-lg font-semibold">Weekly hours</h2>
        <ul className="text-sm text-muted-foreground">
          {doctor.schedules.map((s) => (
            <li key={s.id}>
              Day {s.weekday}: {minutesToHHmm(s.startMin)}–{minutesToHHmm(s.endMin)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
