"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { WEEKDAYS } from "@/lib/serialize";

type Schedule = { weekday: number; startMin: number; endMin: number };

export function ScheduleEditor({
  doctors,
}: {
  doctors: { id: string; name: string; schedules: Schedule[]; breaks: Schedule[] }[];
}) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const current = useMemo(() => doctors.find((d) => d.id === doctorId), [doctorId, doctors]);
  const [pending, setPending] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    setPending(true);
    const schedules: Schedule[] = [];
    for (let weekday = 0; weekday <= 6; weekday++) {
      const start = e.currentTarget.querySelector<HTMLInputElement>(`[name="start-${weekday}"]`)?.value;
      const end = e.currentTarget.querySelector<HTMLInputElement>(`[name="end-${weekday}"]`)?.value;
      if (start && end) {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        schedules.push({ weekday, startMin: sh * 60 + sm, endMin: eh * 60 + em });
      }
    }
    await fetch(`/api/v1/doctors/${doctorId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedules,
        breaks: current.breaks,
      }),
    });
    setPending(false);
    router.refresh();
  }

  function hhmm(min: number) {
    return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  }

  return (
    <form key={doctorId} onSubmit={save} className="space-y-6">
      <select
        className="h-9 rounded-md border px-3 text-sm"
        value={doctorId}
        onChange={(e) => setDoctorId(e.target.value)}
      >
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <div className="grid gap-3">
        {WEEKDAYS.map((label, weekday) => {
          const row = current?.schedules.find((s) => s.weekday === weekday);
          return (
            <div key={weekday} className="grid grid-cols-3 items-center gap-3 text-sm">
              <span>{label}</span>
              <input
                name={`start-${weekday}`}
                type="time"
                defaultValue={row ? hhmm(row.startMin) : ""}
                className="h-9 rounded-md border px-2"
              />
              <input
                name={`end-${weekday}`}
                type="time"
                defaultValue={row ? hhmm(row.endMin) : ""}
                className="h-9 rounded-md border px-2"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Leave a day blank for off. Seeded doctors work Sunday–Friday; Saturday is typically off in Nepal.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save schedule"}
      </Button>
    </form>
  );
}
