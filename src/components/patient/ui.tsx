"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api, errorMessage, type ApiResult } from "@/lib/patient-client";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/patient-types";
import { statusVariant } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Loads a GET endpoint; pass null to skip. */
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const key = path ? `${path}#${version}` : null;
  // The last settled request; kept while the next one loads so lists don't flash empty.
  const [settled, setSettled] = useState<{
    key: string;
    result: ApiResult<T> | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    api<T>(path)
      .then((result) => {
        if (!cancelled) setSettled({ key, result, error: null });
      })
      .catch((e) => {
        if (!cancelled) setSettled({ key, result: null, error: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = key !== null && settled?.key === key;
  const result = path ? settled?.result : null;
  return {
    data: result?.data ?? null,
    meta: result?.meta ?? null,
    error: current ? settled.error : null,
    loading: key !== null && !current,
    reload,
  };
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={statusVariant(status)}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-primary",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed bg-white/60 px-5 py-8 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      role="alert"
    >
      <span>{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-semibold underline-offset-4 hover:underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-xl border bg-white p-5 shadow-sm sm:p-6", className)} {...props} />;
}
