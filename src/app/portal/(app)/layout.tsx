import { PatientShell } from "@/components/patient/shell";

export default function PatientAppLayout({ children }: { children: React.ReactNode }) {
  return <PatientShell>{children}</PatientShell>;
}
