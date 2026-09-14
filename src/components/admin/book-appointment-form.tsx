"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SlotPicker } from "@/components/admin/slot-picker";

export function BookAppointmentForm({
  doctors,
  patients,
}: {
  doctors: { id: string; name: string }[];
  patients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [startAt, setStartAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: form.get("patientId"),
        doctorId,
        startAt,
        notes: form.get("notes") || undefined,
      }),
    });
    const json = await res.json();
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Could not book");
      return;
    }
    router.push("/appointments");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <div className="space-y-1">
        <Label>Patient</Label>
        <select name="patientId" className="h-9 w-full rounded-md border px-3 text-sm" required>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Doctor</Label>
        <select
          className="h-9 w-full rounded-md border px-3 text-sm"
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value);
            setStartAt("");
          }}
          required
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Date</Label>
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
      <div className="space-y-1">
        <Label>Available slots (Asia/Kathmandu)</Label>
        <SlotPicker doctorId={doctorId} date={date} value={startAt} onChange={setStartAt} />
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea name="notes" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        If payment is required, the appointment stays pending until eSewa, Khalti, or cash
        succeeds.
      </p>
      <Button type="submit" disabled={pending || !startAt}>
        {pending ? "Booking…" : "Book appointment"}
      </Button>
    </form>
  );
}
