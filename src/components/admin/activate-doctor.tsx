"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ActivateDoctor({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  async function run() {
    await fetch(`/api/v1/doctors/${id}/${active ? "deactivate" : "activate"}`, { method: "POST" });
    router.refresh();
  }
  return (
    <Button variant="outline" onClick={run}>
      {active ? "Deactivate account" : "Activate account"}
    </Button>
  );
}
