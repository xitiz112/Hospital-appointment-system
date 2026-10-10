import { Suspense } from "react";
import { PatientRegisterForm } from "@/components/patient/auth-forms";

export default function PatientRegisterPage() {
  return (
    <Suspense>
      <PatientRegisterForm />
    </Suspense>
  );
}
