"use client";

import { useMemo, useState } from "react";
import { formatKtm } from "@/lib/format";
import { upcomingDates, WEEKDAY_SHORT, type DoctorSummary, type Slot } from "@/lib/patient-types";
import { useApi } from "@/components/patient/ui";
import { cn } from "@/lib/utils";

const DAYS_AHEAD = 21;

function groupSlots(slots: Slot[]) {
  const groups: { label: string; slots: Slot[] }[] = [
    { label: "Morning", slots: [] },
    { label: "Afternoon", slots: [] },
    { label: "Evening", slots: [] },
  ];
  for (const s of slots) {
    const hour = Number(formatKtm(s.startAt, "H"));
    groups[hour < 12 ? 0 : hour < 17 ? 1 : 2].slots.push(s);
  }
  return groups.filter((g) => g.slots.length);
}

export function SlotChooser({
  doctorId,
  schedules,
  value,
  onChange,
  excludeStartAt,
}: {
  doctorId: string;
  schedules: DoctorSummary["schedules"];
  value: string | null;
  onChange: (startAt: string | null) => void;
  /** Current slot when rescheduling, so it isn't offered again. */
  excludeStartAt?: string;
}) {
  const workDays = useMemo(() => new Set(schedules.map((s) => s.weekday)), [schedules]);
  const dates = useMemo(() => upcomingDates(DAYS_AHEAD), []);
  const [date, setDate] = useState(() => dates.find((d) => workDays.has(d.weekday))?.value ?? dates[0].value);

  const slots = useApi<Slot[]>(`/api/v1/doctors/${doctorId}/slots?date=${date}`);
  const list = (slots.data ?? []).filter((s) => s.startAt !== excludeStartAt);
  const open = list.filter((s) => s.available);
  const groups = groupSlots(list);

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Choose a date">
        {dates.map((d) => {
          const off = !workDays.has(d.weekday);
          const selected = d.value === date;
          return (
            <button
              key={d.value}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                setDate(d.value);
                onChange(null);
              }}
              className={cn(
                "flex w-16 shrink-0 snap-start flex-col items-center rounded-lg border px-2 py-2.5 transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : off
                    ? "border-dashed bg-transparent text-muted-foreground/70"
                    : "bg-white hover:border-accent",
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide">{WEEKDAY_SHORT[d.weekday]}</span>
              <span className="text-lg font-semibold leading-tight">{d.day}</span>
              <span className="text-[11px]">{off ? "Off" : d.month}</span>
            </button>
          );
        })}
      </div>

      {slots.loading ? (
        <p className="text-sm text-muted-foreground">Checking open times…</p>
      ) : slots.error ? (
        <p className="text-sm text-destructive">{slots.error}</p>
      ) : !list.length ? (
        <p className="rounded-lg bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          The doctor isn&apos;t seeing patients on this day. Pick another date.
        </p>
      ) : !open.length ? (
        <p className="rounded-lg bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          Every slot on this day is taken or has passed. Try another date.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {g.slots.map((s) => (
                  <button
                    key={s.startAt}
                    type="button"
                    disabled={!s.available}
                    onClick={() => onChange(s.startAt)}
                    aria-pressed={value === s.startAt}
                    className={cn(
                      "h-10 rounded-md border text-sm font-medium transition-colors",
                      value === s.startAt
                        ? "border-primary bg-primary text-primary-foreground"
                        : s.available
                          ? "bg-white hover:border-accent hover:bg-secondary"
                          : "cursor-not-allowed border-transparent bg-muted/60 text-muted-foreground/60 line-through",
                    )}
                  >
                    {formatKtm(s.startAt, "h:mm a")}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Times are shown in Nepal time (NPT).</p>
        </div>
      )}
    </div>
  );
}
