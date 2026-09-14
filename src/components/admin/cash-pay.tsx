"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CashPayButton({ id, payable }: { id: string; payable: boolean }) {
  const router = useRouter();
  if (!payable) return null;
  async function run() {
    await fetch(`/api/v1/payments/${id}/cash`, { method: "POST" });
    router.refresh();
  }
  return (
    <Button size="sm" onClick={run}>
      Mark cash paid (confirms visit)
    </Button>
  );
}
