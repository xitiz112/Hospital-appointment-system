"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SlotPicker } from "@/components/admin/slot-picker";

export function RescheduleForm({
  appointmentId,
  doctorId,
}: {
  appointmentId: string;
  doctorId: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [startAt, setStartAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/appointments/${appointmentId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt, reason: "Rescheduled by admin" }),
    });
    const json = await res.json();
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Could not reschedule");
      return;
    }
    router.push("/appointments");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <div className="space-y-1">
        <Label>New date</Label>
        <input
          type="date"
          className="h-9 w-full rounded-md border px-3 text-sm"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setStartAt("");
          }}
          required
        />
      </div>
      <SlotPicker doctorId={doctorId} date={date} value={startAt} onChange={setStartAt} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || !startAt}>
        {pending ? "Saving…" : "Reschedule"}
      </Button>
    </form>
  );
}
