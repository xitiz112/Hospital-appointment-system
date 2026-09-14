"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WEEKDAYS } from "@/lib/serialize";
import { SlotPicker } from "@/components/admin/slot-picker";
import { formatKtm } from "@/lib/format";

type Hours = { weekday: number; startMin: number; endMin: number; label?: string | null };

export function ScheduleEditor({
  doctors,
}: {
  doctors: {
    id: string;
    name: string;
    schedules: Hours[];
    breaks: Hours[];
    unavailability: { id: string; startAt: string; endAt: string; reason: string | null }[];
  }[];
}) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const current = useMemo(() => doctors.find((d) => d.id === doctorId), [doctorId, doctors]);
  const [pending, setPending] = useState(false);
  const [previewDate, setPreviewDate] = useState("");

  function hhmm(min: number) {
    return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    setPending(true);
    const form = e.currentTarget;
    const schedules: Hours[] = [];
    const breaks: Hours[] = [];
    for (let weekday = 0; weekday <= 6; weekday++) {
      const start = form.querySelector<HTMLInputElement>(`[name="start-${weekday}"]`)?.value;
      const end = form.querySelector<HTMLInputElement>(`[name="end-${weekday}"]`)?.value;
      if (start && end) {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        schedules.push({ weekday, startMin: sh * 60 + sm, endMin: eh * 60 + em });
      }
      const bStart = form.querySelector<HTMLInputElement>(`[name="break-start-${weekday}"]`)?.value;
      const bEnd = form.querySelector<HTMLInputElement>(`[name="break-end-${weekday}"]`)?.value;
      if (bStart && bEnd) {
        const [sh, sm] = bStart.split(":").map(Number);
        const [eh, em] = bEnd.split(":").map(Number);
        breaks.push({ weekday, startMin: sh * 60 + sm, endMin: eh * 60 + em, label: "Break" });
      }
    }
    await fetch(`/api/v1/doctors/${doctorId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedules, breaks }),
    });
    setPending(false);
    router.refresh();
  }

  async function addUnavailability(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const start = String(form.get("startAt"));
    const end = String(form.get("endAt"));
    await fetch(`/api/v1/doctors/${doctorId}/unavailability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        reason: form.get("reason") || undefined,
      }),
    });
    e.currentTarget.reset();
    router.refresh();
  }

  async function removeUnavailability(id: string) {
    await fetch(`/api/v1/doctors/${doctorId}/unavailability/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-10">
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

      <form key={`hours-${doctorId}`} onSubmit={save} className="space-y-4">
        <h2 className="text-lg font-semibold">Working hours and breaks</h2>
        <div className="grid gap-3">
          {WEEKDAYS.map((label, weekday) => {
            const row = current?.schedules.find((s) => s.weekday === weekday);
            const br = current?.breaks.find((s) => s.weekday === weekday);
            return (
              <div key={weekday} className="grid items-center gap-2 text-sm md:grid-cols-[7rem_1fr_1fr_1fr_1fr]">
                <span className="font-medium">{label}</span>
                <input name={`start-${weekday}`} type="time" defaultValue={row ? hhmm(row.startMin) : ""} className="h-9 rounded-md border px-2" />
                <input name={`end-${weekday}`} type="time" defaultValue={row ? hhmm(row.endMin) : ""} className="h-9 rounded-md border px-2" />
                <input name={`break-start-${weekday}`} type="time" defaultValue={br ? hhmm(br.startMin) : ""} className="h-9 rounded-md border px-2" placeholder="Break start" />
                <input name={`break-end-${weekday}`} type="time" defaultValue={br ? hhmm(br.endMin) : ""} className="h-9 rounded-md border px-2" />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Leave a day blank for off. Break columns are optional (e.g. 13:00–14:00 lunch).</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save schedule"}
        </Button>
      </form>

      <form key={`leave-${doctorId}`} onSubmit={addUnavailability} className="grid max-w-xl gap-3">
        <h2 className="text-lg font-semibold">Leave / unavailability</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>From</Label>
            <input name="startAt" type="datetime-local" required className="h-9 w-full rounded-md border px-2 text-sm" />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <input name="endAt" type="datetime-local" required className="h-9 w-full rounded-md border px-2 text-sm" />
          </div>
        </div>
        <input name="reason" placeholder="Reason (holiday, leave…)" className="h-9 rounded-md border px-3 text-sm" />
        <Button type="submit" variant="outline">
          Add unavailability
        </Button>
        <ul className="space-y-2 text-sm">
          {current?.unavailability.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <span>
                {formatKtm(u.startAt)} → {formatKtm(u.endAt)}
                {u.reason ? ` · ${u.reason}` : ""}
              </span>
              <Button type="button" size="sm" variant="destructive" onClick={() => removeUnavailability(u.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Generated slots preview</h2>
        <input
          type="date"
          className="h-9 rounded-md border px-3 text-sm"
          value={previewDate}
          onChange={(e) => setPreviewDate(e.target.value)}
        />
        <SlotPicker doctorId={doctorId} date={previewDate} onChange={() => undefined} />
      </div>
    </div>
  );
}
