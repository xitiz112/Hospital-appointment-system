"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditDepartmentForm({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/v1/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
      }),
    });
    const json = await res.json();
    setPending(false);
    setMessage(json.success ? "Saved" : json.error?.message ?? "Failed");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-3">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input name="name" defaultValue={name} required />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={description} />
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save department"}
      </Button>
    </form>
  );
}
