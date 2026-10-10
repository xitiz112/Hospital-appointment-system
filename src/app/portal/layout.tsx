import type { Metadata } from "next";
import { PatientSessionProvider } from "@/components/patient/session";

export const metadata: Metadata = {
  title: "Patient Portal · Hospital Appointment System",
  description: "Book, pay for, and manage your hospital appointments",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PatientSessionProvider>{children}</PatientSessionProvider>;
}
