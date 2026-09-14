"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Spec = { id: string; name: string; departmentId: string | null };

export function SpecializationManager({
  departments,
  specializations,
}: {
  departments: { id: string; name: string }[];
  specializations: Spec[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/specializations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        departmentId: form.get("departmentId") || null,
      }),
    });
    const json = await res.json();
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Could not create");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  async function save(id: string, form: HTMLFormElement) {
    const data = new FormData(form);
    await fetch(`/api/v1/specializations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        departmentId: data.get("departmentId") || null,
      }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this specialization?")) return;
    await fetch(`/api/v1/specializations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="grid max-w-xl gap-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" required />
        </div>
        <div className="space-y-1">
          <Label>Department (optional)</Label>
          <select name="departmentId" className="h-9 w-full rounded-md border px-3 text-sm">
            <option value="">Unassigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add specialization"}
        </Button>
      </form>
      <div className="space-y-3">
        {specializations.map((s) => (
          <form
            key={s.id}
            className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              save(s.id, e.currentTarget);
            }}
          >
            <Input name="name" defaultValue={s.name} required />
            <select name="departmentId" defaultValue={s.departmentId ?? ""} className="h-9 rounded-md border px-3 text-sm">
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline">
              Save
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => remove(s.id)}>
              Delete
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
