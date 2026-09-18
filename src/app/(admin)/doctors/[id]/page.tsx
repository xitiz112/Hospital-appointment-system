import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DoctorForm } from "@/components/admin/doctor-form";
import { ActivateDoctor } from "@/components/admin/activate-doctor";
import { DeleteEntityButton } from "@/components/admin/entity-actions";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {doctor.user.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doctor.user.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">No photo</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{doctor.user.name}</h1>
            <p className="text-sm text-muted-foreground">{doctor.department.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActivateDoctor id={doctor.id} active={doctor.user.status === "ACTIVE"} />
          <DeleteEntityButton
            label="doctor"
            deleteUrl={`/api/v1/doctors/${doctor.id}`}
            redirectTo="/doctors"
          />
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Update doctor</h2>
        <DoctorForm
          departments={departments}
          specializations={specializations}
          doctor={{
            id: doctor.id,
            name: doctor.user.name,
            email: doctor.user.email,
            phone: doctor.user.phone,
            imageUrl: doctor.user.imageUrl,
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
      </div>
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
