"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; name: string };

export function DoctorForm({
  departments,
  specializations,
  doctor,
}: {
  departments: Option[];
  specializations: Option[];
  doctor?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    departmentId: string;
    specializationId?: string | null;
    qualifications?: string | null;
    experienceYears: number;
    consultationFee: number;
    appointmentDurationMin: number;
    location?: string | null;
    bio?: string | null;
    isAvailable: boolean;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(doctor);

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
      departmentId: form.get("departmentId"),
      specializationId: form.get("specializationId") || null,
      qualifications: form.get("qualifications"),
      experienceYears: Number(form.get("experienceYears") || 0),
      consultationFee: Number(form.get("consultationFee")),
      appointmentDurationMin: Number(form.get("appointmentDurationMin")),
      location: form.get("location"),
      bio: form.get("bio"),
      isAvailable: form.get("isAvailable") === "on",
    };
    const res = await fetch(isEdit ? `/api/v1/doctors/${doctor!.id}` : "/api/v1/doctors", {
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
    router.push("/doctors");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" defaultValue={doctor?.name} required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={doctor?.email} required disabled={isEdit} />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={doctor?.phone ?? ""} />
        </div>
        {!isEdit ? (
          <div className="space-y-1">
            <Label>Password</Label>
            <Input name="password" type="password" placeholder="Defaults to Password123!" />
          </div>
        ) : null}
        <div className="space-y-1">
          <Label>Department</Label>
          <select name="departmentId" defaultValue={doctor?.departmentId} className="h-9 w-full rounded-md border px-3 text-sm" required>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Specialization</Label>
          <select name="specializationId" defaultValue={doctor?.specializationId ?? ""} className="h-9 w-full rounded-md border px-3 text-sm">
            <option value="">None</option>
            {specializations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Consultation fee (NPR)</Label>
          <Input name="consultationFee" type="number" defaultValue={doctor?.consultationFee ?? 1000} required />
        </div>
        <div className="space-y-1">
          <Label>Duration (min)</Label>
          <Input name="appointmentDurationMin" type="number" defaultValue={doctor?.appointmentDurationMin ?? 30} required />
        </div>
        <div className="space-y-1">
          <Label>Experience (years)</Label>
          <Input name="experienceYears" type="number" defaultValue={doctor?.experienceYears ?? 0} />
        </div>
        <div className="space-y-1">
          <Label>Location</Label>
          <Input name="location" defaultValue={doctor?.location ?? ""} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Qualifications</Label>
        <Input name="qualifications" defaultValue={doctor?.qualifications ?? ""} />
      </div>
      <div className="space-y-1">
        <Label>Bio</Label>
        <Textarea name="bio" defaultValue={doctor?.bio ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAvailable" defaultChecked={doctor?.isAvailable ?? true} />
        Available for booking
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : isEdit ? "Update doctor" : "Create doctor"}
      </Button>
    </form>
  );
}
