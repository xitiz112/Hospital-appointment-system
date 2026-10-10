"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage, type PatientUser } from "@/lib/patient-client";
import { usePatientSession } from "@/components/patient/session";
import { Avatar, ErrorNote, PageHeader, Panel } from "@/components/patient/ui";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ProfileForm({ user }: { user: PatientUser }) {
  const { setUser } = usePatientSession();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? "",
    dateOfBirth: user.patient?.dateOfBirth?.slice(0, 10) ?? "",
    gender: user.patient?.gender ?? "",
    address: user.patient?.address ?? "",
  });
  const [prefs, setPrefs] = useState({
    notifyEmail: user.patient?.notifyEmail ?? true,
    notifyPush: user.patient?.notifyPush ?? true,
    notifySms: user.patient?.notifySms ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const { data } = await api<PatientUser>("/api/v1/me", {
        method: "PATCH",
        body: {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          address: form.address.trim() || null,
          ...prefs,
        },
      });
      setUser(data);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Panel className="space-y-5">
        <h2 className="font-semibold">Personal details</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={set("name")} minLength={2} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} minLength={7} maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth}
              onChange={set("dateOfBirth")}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" value={form.gender} onChange={set("gender")} className={selectClass}>
              <option value="">Prefer not to say</option>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={set("address")} />
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4">
        <div>
          <h2 className="font-semibold">How we reach you</h2>
          <p className="mt-1 text-sm text-muted-foreground">Reminders and updates about your appointments.</p>
        </div>
        {(
          [
            ["notifyEmail", "Email", "Booking confirmations and reminders by email"],
            ["notifyPush", "Push notifications", "Alerts in the patient mobile app"],
            ["notifySms", "SMS", "Text message reminders"],
          ] as const
        ).map(([key, label, hint]) => (
          <label key={key} className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(e) => {
                setSaved(false);
                setPrefs((p) => ({ ...p, [key]: e.target.checked }));
              }}
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
            />
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </label>
        ))}
      </Panel>

      {error ? <ErrorNote message={error} /> : null}
      <div className="flex items-center justify-end gap-3">
        {saved ? <span className="text-sm text-emerald-700">Saved</span> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function PhotoCard({ user }: { user: PatientUser }) {
  const { setUser } = usePatientSession();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api<{ imageUrl: string }>("/api/v1/me/photo", { method: "POST", body });
      setUser({ ...user, imageUrl: data.imageUrl });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/me/photo", { method: "DELETE" });
      setUser({ ...user, imageUrl: null });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="flex flex-col items-center text-center">
      <Avatar name={user.name} src={user.imageUrl} className="h-24 w-24 text-2xl" />
      <p className="mt-4 font-semibold">{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <div className="mt-5 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          <Camera className="h-4 w-4" />
          {busy ? "Uploading…" : user.imageUrl ? "Change photo" : "Add photo"}
        </Button>
        {user.imageUrl ? (
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy} aria-label="Remove photo">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </Panel>
  );
}

export default function PatientProfilePage() {
  const { user } = usePatientSession();
  if (!user) return null;
  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile" description="Keep your details current so the hospital can reach you." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div>
          <PhotoCard user={user} />
        </div>
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
