import { adminDoctorOptions, adminPatientOptions } from "@/lib/admin-queries";
import { BookAppointmentForm } from "@/components/admin/book-appointment-form";

export default async function NewAppointmentPage() {
  const [doctors, patients] = await Promise.all([
    adminDoctorOptions({ availableOnly: true }),
    adminPatientOptions(),
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
