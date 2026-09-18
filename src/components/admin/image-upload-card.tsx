"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ImageUploadCard({
  title,
  description,
  currentUrl,
  uploadUrl,
  fieldName = "file",
}: {
  title: string;
  description?: string;
  currentUrl?: string | null;
  uploadUrl: string;
  fieldName?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(file: File) {
    setPending(true);
    setMessage(null);
    const body = new FormData();
    body.append(fieldName, file);
    try {
      const res = await fetch(uploadUrl, { method: "POST", body });
      const json = await res.json().catch(() => null);
      setPending(false);
      if (!json?.success) {
        setMessage(json?.error?.message ?? `Upload failed (HTTP ${res.status})`);
        return;
      }
      const next = json.data?.logoUrl ?? json.data?.imageUrl ?? null;
      setPreview(next);
      setMessage("Saved");
      router.refresh();
    } catch (err) {
      setPending(false);
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function remove() {
    setPending(true);
    setMessage(null);
    const res = await fetch(uploadUrl, { method: "DELETE" });
    const json = await res.json();
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Remove failed");
      return;
    }
    setPreview(null);
    setMessage("Removed");
    router.refresh();
  }

  return (
    <div className="grid max-w-xl gap-3 rounded-lg border p-4">
      <div>
        <Label className="text-base">{title}</Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.currentTarget.value = "";
            }}
          />
          <Button type="button" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? "Working…" : preview ? "Replace" : "Upload"}
          </Button>
          {preview ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => void remove()}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
