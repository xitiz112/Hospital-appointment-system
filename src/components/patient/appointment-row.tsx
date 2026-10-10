"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatKtm } from "@/lib/format";
import { needsPayment, type Appointment } from "@/lib/patient-types";
import { Avatar, StatusBadge } from "@/components/patient/ui";

export function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const unpaid = needsPayment(appointment);
  return (
    <Link
      href={`/portal/appointments/${appointment.id}`}
      className="group flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5 transition-colors hover:border-accent/50 hover:bg-[#fbfdff]"
    >
      <div className="w-14 shrink-0 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          {formatKtm(appointment.startAt, "MMM")}
        </p>
        <p className="text-2xl font-semibold leading-none text-foreground">{formatKtm(appointment.startAt, "d")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{formatKtm(appointment.startAt, "EEE")}</p>
      </div>
      <div className="h-10 w-px bg-border" aria-hidden />
      <Avatar name={appointment.doctor.user.name} src={appointment.doctor.user.imageUrl} className="hidden h-10 w-10 sm:flex" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{appointment.doctor.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {appointment.doctor.department.name} · {formatKtm(appointment.startAt, "h:mm a")}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={appointment.status} />
        {unpaid ? <span className="text-[11px] font-medium text-amber-700">Payment due</span> : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
