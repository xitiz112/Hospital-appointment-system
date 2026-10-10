import { Suspense } from "react";
import { DoctorSearch } from "@/components/patient/doctor-search";
import { Loading } from "@/components/patient/ui";

export default function PatientDoctorsPage() {
  return (
    <Suspense fallback={<Loading label="Finding doctors…" />}>
      <DoctorSearch />
    </Suspense>
  );
}
