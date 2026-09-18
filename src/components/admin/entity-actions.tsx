"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EntityActions({
  editHref,
  deleteUrl,
  redirectTo,
  label,
}: {
  editHref: string;
  deleteUrl: string;
  redirectTo: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setPending(true);
    setError(null);
    const res = await fetch(deleteUrl, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    setPending(false);
    if (!json?.success) {
      setError(json?.error?.message ?? "Delete failed");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href={editHref}>Edit</Link>
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => void onDelete()}>
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
      {error ? <p className="max-w-xs text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function DeleteEntityButton({
  deleteUrl,
  redirectTo,
  label,
}: {
  deleteUrl: string;
  redirectTo: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setPending(true);
    setError(null);
    const res = await fetch(deleteUrl, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    setPending(false);
    if (!json?.success) {
      setError(json?.error?.message ?? "Delete failed");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="destructive" disabled={pending} onClick={() => void onDelete()}>
        {pending ? "Deleting…" : `Delete ${label}`}
      </Button>
      {error ? <p className="max-w-sm text-right text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
