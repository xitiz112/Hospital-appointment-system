"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatKtm } from "@/lib/format";

type Slot = { startAt: string; endAt: string; available: boolean };

export function SlotPicker({
  doctorId,
  date,
  value,
  onChange,
}: {
  doctorId: string;
  date: string;
  value?: string;
  onChange: (startAt: string) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    fetch(`/api/v1/doctors/${doctorId}/slots?date=${date}`)
      .then((r) => r.json())
      .then((json) => setSlots(json.success ? json.data : []))
      .finally(() => setLoading(false));
  }, [doctorId, date]);

  if (!doctorId || !date) {
    return <p className="text-sm text-muted-foreground">Select a doctor and date to see slots.</p>;
  }
  if (loading) return <p className="text-sm text-muted-foreground">Loading slots…</p>;
  if (!slots.length) return <p className="text-sm text-muted-foreground">No working hours on this date.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((s) => (
        <Button
          key={s.startAt}
          type="button"
          size="sm"
          variant={value === s.startAt ? "default" : "outline"}
          disabled={!s.available}
          onClick={() => onChange(s.startAt)}
        >
          {formatKtm(s.startAt, "HH:mm")}
        </Button>
      ))}
    </div>
  );
}
