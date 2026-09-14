"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AppointmentActions({
  id,
  status,
  canConfirm = false,
  awaitingPayment = false,
}: {
  id: string;
  status: string;
  canConfirm?: boolean;
  awaitingPayment?: boolean;
}) {
  const router = useRouter();
  async function cancel() {
    await fetch(`/api/v1/appointments/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cancelled by admin" }),
    });
    router.refresh();
  }
  async function setStatus(next: "CONFIRMED" | "COMPLETED" | "NO_SHOW") {
    await fetch(`/api/v1/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status === "PENDING" && canConfirm ? (
        <Button size="sm" variant="outline" onClick={() => setStatus("CONFIRMED")}>
          Confirm
        </Button>
      ) : null}
      {status === "PENDING" && awaitingPayment ? (
        <span className="self-center text-xs text-muted-foreground">Awaiting payment</span>
      ) : null}
      {status === "CONFIRMED" ? (
        <>
          <Button size="sm" variant="outline" onClick={() => setStatus("COMPLETED")}>
            Complete
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatus("NO_SHOW")}>
            No-show
          </Button>
        </>
      ) : null}
      {["PENDING", "CONFIRMED"].includes(status) ? (
        <>
          <Button size="sm" variant="outline" asChild>
            <a href={`/appointments/${id}`}>Details</a>
          </Button>
          <Button size="sm" variant="destructive" onClick={cancel}>
            Cancel
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" asChild>
          <a href={`/appointments/${id}`}>Details</a>
        </Button>
      )}
    </div>
  );
}
