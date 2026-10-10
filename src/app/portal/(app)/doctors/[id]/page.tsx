import { DoctorBooking } from "@/components/patient/doctor-booking";

export default async function PatientDoctorPage({ params }: PageProps<"/portal/doctors/[id]">) {
  const { id } = await params;
  return <DoctorBooking doctorId={id} />;
}
