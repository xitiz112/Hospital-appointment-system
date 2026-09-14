"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm(props: {
  name: string;
  email: string;
  phone: string;
  address: string;
  cancellationHours: number;
  paymentRequired: boolean;
  defaultAppointmentDurationMin: number;
  timezone: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        address: form.get("address"),
        cancellationHours: Number(form.get("cancellationHours")),
        paymentRequired: form.get("paymentRequired") === "on",
        defaultAppointmentDurationMin: Number(form.get("defaultAppointmentDurationMin")),
        timezone: form.get("timezone"),
      }),
    });
    const json = await res.json();
    setPending(false);
    setMessage(json.success ? "Saved" : json.error?.message ?? "Failed");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <div className="space-y-1">
        <Label>Hospital name</Label>
        <Input name="name" defaultValue={props.name} required />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input name="email" defaultValue={props.email} />
      </div>
      <div className="space-y-1">
        <Label>Phone</Label>
        <Input name="phone" defaultValue={props.phone} />
      </div>
      <div className="space-y-1">
        <Label>Address</Label>
        <Input name="address" defaultValue={props.address} />
      </div>
      <div className="space-y-1">
        <Label>Timezone</Label>
        <Input name="timezone" defaultValue={props.timezone} />
      </div>
      <div className="space-y-1">
        <Label>Cancellation window (hours)</Label>
        <Input name="cancellationHours" type="number" defaultValue={props.cancellationHours} />
      </div>
      <div className="space-y-1">
        <Label>Default appointment duration (min)</Label>
        <Input
          name="defaultAppointmentDurationMin"
          type="number"
          defaultValue={props.defaultAppointmentDurationMin}
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="paymentRequired"
          defaultChecked={props.paymentRequired}
          className="mt-0.5"
        />
        <span>
          Require successful payment before confirmation
          <span className="mt-1 block text-xs text-muted-foreground">
            When on, bookings with a consultation fee stay Pending until eSewa, Khalti, or cash
            succeeds. Staff cannot confirm unpaid visits.
          </span>
        </span>
      </label>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
