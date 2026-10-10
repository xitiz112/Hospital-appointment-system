import { AppointmentDetail } from "@/components/patient/appointment-detail";

export default async function PatientAppointmentPage({
  params,
  searchParams,
}: PageProps<"/portal/appointments/[id]">) {
  const { id } = await params;
  const { booked } = await searchParams;
  return <AppointmentDetail key={id} id={id} justBooked={booked === "1"} />;
}
