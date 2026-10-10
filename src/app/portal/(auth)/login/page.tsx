import { Suspense } from "react";
import { PatientLoginForm } from "@/components/patient/auth-forms";

export default function PatientLoginPage() {
  return (
    <Suspense>
      <PatientLoginForm />
    </Suspense>
  );
}
