"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
};

export function UserForm({ user }: { user?: EditableUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "PATIENT">("ADMIN");
  const isEdit = Boolean(user);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setPending(true);
    setError(null);
    setSaved(false);
    const form = new FormData(formEl);
    const password = String(form.get("password") ?? "");
    const phone = String(form.get("phone") ?? "").trim();
    const payload = isEdit
      ? {
          name: form.get("name"),
          email: form.get("email"),
          phone: phone || null,
          status: form.get("status"),
          password: password || undefined,
        }
      : {
          name: form.get("name"),
          email: form.get("email"),
          phone: phone || undefined,
          password,
          role,
        };
    const res = await fetch(isEdit ? `/api/v1/admin/users/${user!.id}` : "/api/v1/admin/users", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    setPending(false);
    if (!json?.success) {
      setError(json?.error?.message ?? (isEdit ? "Could not update user" : "Could not create user"));
      return;
    }
    if (isEdit) {
      formEl.querySelector<HTMLInputElement>('input[name="password"]')!.value = "";
      setSaved(true);
      router.refresh();
      return;
    }
    router.push("/users");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      {!isEdit ? (
        <div className="space-y-1">
          <Label>Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "PATIENT")}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="ADMIN">Administrator</option>
            <option value="PATIENT">Patient</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Doctors need a department and fee —{" "}
            <Link href="/doctors/new" className="text-primary underline-offset-4 hover:underline">
              add them on the Doctors page
            </Link>
            .
          </p>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" defaultValue={user?.name} minLength={2} required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={user?.email} required />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={user?.phone ?? ""} minLength={7} maxLength={20} />
        </div>
        <div className="space-y-1">
          <Label>{isEdit ? "New password" : "Password"}</Label>
          <Input
            name="password"
            type="password"
            minLength={8}
            required={!isEdit}
            placeholder={isEdit ? "Leave blank to keep current" : undefined}
            autoComplete="new-password"
          />
        </div>
        {isEdit ? (
          <div className="space-y-1">
            <Label>Status</Label>
            <select
              name="status"
              defaultValue={user!.status}
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        ) : null}
      </div>
      {isEdit ? (
        <p className="text-xs text-muted-foreground">
          Setting a new password or deactivating the account signs this user out of every device.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Saved.</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create user"}
        </Button>
      </div>
    </form>
  );
}

export function UserStatusButton({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setError(null);
    const res = await fetch(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    const json = await res.json().catch(() => null);
    if (!json?.success) {
      setError(json?.error?.message ?? "Update failed");
      return;
    }
    router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={run}>
        {status === "ACTIVE" ? "Deactivate" : "Activate"}
      </Button>
      {error ? <p className="max-w-xs text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
