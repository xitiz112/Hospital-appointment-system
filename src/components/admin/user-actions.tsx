"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateAdminForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone") || undefined,
        password: form.get("password"),
        role: "ADMIN",
      }),
    });
    const json = await res.json();
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Could not create admin");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input name="email" type="email" required />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input name="phone" />
        </div>
        <div className="space-y-1">
          <Label>Password</Label>
          <Input name="password" type="password" minLength={8} required />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add administrator"}
      </Button>
    </form>
  );
}

export function UserStatusButton({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) {
  const router = useRouter();
  async function run() {
    await fetch(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    router.refresh();
  }
  return (
    <Button size="sm" variant="outline" onClick={run}>
      {status === "ACTIVE" ? "Deactivate" : "Activate"}
    </Button>
  );
}
