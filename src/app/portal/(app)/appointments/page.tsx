"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Appointment, AppointmentStatus } from "@/lib/patient-types";
import { AppointmentRow } from "@/components/patient/appointment-row";
import { Empty, ErrorNote, Loading, PageHeader, useApi } from "@/components/patient/ui";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const FILTERS: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Awaiting payment" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "NO_SHOW", label: "Missed" },
];

export default function PatientAppointmentsPage() {
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status) qs.set("status", status);
  const list = useApi<Appointment[]>(`/api/v1/appointments?${qs.toString()}`);
  const total = Number(list.meta?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        eyebrow="Your visits"
        title="Appointments"
        description="Every booking you've made, newest first. Open one to pay, reschedule, cancel, or get your receipt."
        actions={
          <Button asChild>
            <Link href="/portal/doctors">New booking</Link>
          </Button>
        }
      />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-lg border bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                status === f.value && "bg-secondary text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> : null}

      {list.loading && !list.data ? (
        <Loading label="Loading appointments…" />
      ) : !list.data?.length ? (
        <Empty title={status ? "No appointments with this status" : "You haven't booked anything yet"}>
          <Link href="/portal/doctors" className="font-medium text-accent hover:underline">
            Find a doctor
          </Link>
        </Empty>
      ) : (
        <>
          <div className={cn("space-y-2", list.loading && "opacity-60")}>
            {list.data.map((a) => (
              <AppointmentRow key={a.id} appointment={a} />
            ))}
          </div>
          {pages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
