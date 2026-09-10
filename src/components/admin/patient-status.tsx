"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PatientStatusButton({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) {
  const router = useRouter();
  async function run() {
    await fetch(`/api/v1/admin/patients/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    router.refresh();
  }
  return (
    <Button size="sm" variant="outline" onClick={run}>
      {status === "ACTIVE" ? "Deactivate" : "Activate"}
    </Button>
  );
}
