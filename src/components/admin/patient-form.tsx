"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PatientForm({
  patient,
}: {
  patient?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    notifyEmail: boolean;
    notifyPush: boolean;
    notifySms: boolean;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(patient);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone") || undefined,
      password: form.get("password") || undefined,
      dateOfBirth: form.get("dateOfBirth") || null,
      gender: form.get("gender") || null,
      address: form.get("address") || null,
      notifyEmail: form.get("notifyEmail") === "on",
      notifyPush: form.get("notifyPush") === "on",
      notifySms: form.get("notifySms") === "on",
    };
    const res = await fetch(isEdit ? `/api/v1/admin/patients/${patient!.id}` : "/api/v1/admin/patients", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Save failed");
      return;
    }
    router.push(isEdit ? `/patients/${patient!.id}` : "/patients");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" defaultValue={patient?.name} required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={patient?.email} required disabled={isEdit} />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={patient?.phone ?? ""} />
        </div>
        {!isEdit ? (
          <div className="space-y-1">
            <Label>Password</Label>
            <Input name="password" type="password" placeholder="Defaults to Password123!" />
          </div>
        ) : null}
        <div className="space-y-1">
          <Label>Date of birth</Label>
          <Input name="dateOfBirth" type="date" defaultValue={patient?.dateOfBirth ?? ""} />
        </div>
        <div className="space-y-1">
          <Label>Gender</Label>
          <select name="gender" defaultValue={patient?.gender ?? ""} className="h-9 w-full rounded-md border px-3 text-sm">
            <option value="">Not set</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Address</Label>
        <Input name="address" defaultValue={patient?.address ?? ""} />
      </div>
      {isEdit ? (
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyEmail" defaultChecked={patient?.notifyEmail} /> Email
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyPush" defaultChecked={patient?.notifyPush} /> Push
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifySms" defaultChecked={patient?.notifySms} /> SMS
          </label>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : isEdit ? "Update patient" : "Create patient"}
      </Button>
    </form>
  );
}
