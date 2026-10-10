"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/patient-client";
import { formatKtm } from "@/lib/format";
import { minutesToHHmm } from "@/lib/serialize";
import { formatNpr, WEEKDAY_SHORT, type DoctorProfile } from "@/lib/patient-types";
import { usePatientSession } from "@/components/patient/session";
import { SlotChooser } from "@/components/patient/slot-chooser";
import { Avatar, ErrorNote, Loading, Panel, useApi } from "@/components/patient/ui";

function weeklyHours(doctor: DoctorProfile) {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const ranges = doctor.schedules
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => a.startMin - b.startMin)
      .map((s) => `${minutesToHHmm(s.startMin)}–${minutesToHHmm(s.endMin)}`);
    return { weekday, ranges };
  });
}

export function DoctorBooking({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const { hospital } = usePatientSession();
  const doctor = useApi<DoctorProfile>(`/api/v1/doctors/${doctorId}`);
  const [startAt, setStartAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotKey, setSlotKey] = useState(0);

  if (doctor.loading) return <Loading label="Loading doctor…" />;
  if (doctor.error || !doctor.data) {
    return <ErrorNote message={doctor.error ?? "Doctor not found"} onRetry={doctor.reload} />;
  }

  const d = doctor.data;
  const fee = Number(d.consultationFee);
  const payFirst = fee > 0 && (hospital?.paymentRequired ?? true);

  async function book() {
    if (!startAt) return;
    setPending(true);
    setError(null);
    try {
      const { data } = await api<{ id: string }>("/api/v1/appointments", {
        method: "POST",
        body: { doctorId, startAt, notes: notes.trim() || undefined },
      });
      router.push(`/portal/appointments/${data.id}?booked=1`);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
      // Slot may have just been taken — refresh the grid.
      setStartAt(null);
      setSlotKey((k) => k + 1);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/doctors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        All doctors
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="flex items-start gap-4">
              <Avatar name={d.user.name} src={d.user.imageUrl} className="h-20 w-20 text-lg" />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">{d.user.name}</h1>
                <p className="text-sm text-muted-foreground">{d.specialization?.name ?? d.department.name}</p>
                {d.qualifications ? <p className="mt-1 text-xs text-muted-foreground">{d.qualifications}</p> : null}
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Consultation fee</dt>
                <dd className="mt-0.5 font-semibold">{fee > 0 ? formatNpr(fee) : "Free"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Visit length</dt>
                <dd className="mt-0.5 font-semibold">{d.appointmentDurationMin} min</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Experience</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  {d.experienceYears} years
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd className="mt-0.5 font-semibold">{d.department.name}</dd>
              </div>
            </dl>
            {d.location ? (
              <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {d.location}
              </p>
            ) : null}
            {d.bio ? <p className="mt-4 text-sm leading-6 text-foreground/80">{d.bio}</p> : null}
          </Panel>

          <Panel>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Weekly hours
            </h2>
            <ul className="mt-3 divide-y text-sm">
              {weeklyHours(d).map((row) => (
                <li key={row.weekday} className="flex justify-between gap-4 py-2">
                  <span className="text-muted-foreground">{WEEKDAY_SHORT[row.weekday]}</span>
                  <span className={row.ranges.length ? "text-right font-medium" : "text-muted-foreground"}>
                    {row.ranges.length ? row.ranges.join(", ") : "Closed"}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Choose a time</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a day, then an open slot.
            </p>
          </div>

          {!d.isAvailable ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {d.user.name} isn&apos;t taking new bookings right now. Please choose another doctor.
            </p>
          ) : (
            <>
              <SlotChooser
                key={slotKey}
                doctorId={doctorId}
                schedules={d.schedules}
                value={startAt}
                onChange={setStartAt}
              />

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Reason for visit <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Symptoms or anything the doctor should know"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {error ? <ErrorNote message={error} /> : null}

              <div className="flex flex-col gap-4 rounded-lg bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  {startAt ? (
                    <>
                      <p className="font-semibold">{formatKtm(startAt, "EEEE, d MMMM · h:mm a")}</p>
                      <p className="text-muted-foreground">
                        {payFirst
                          ? `Pay ${formatNpr(fee)} with eSewa after booking to confirm.`
                          : "Your booking is confirmed straight away."}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No time selected yet.</p>
                  )}
                </div>
                <Button size="lg" onClick={book} disabled={!startAt || pending}>
                  {pending ? "Booking…" : "Book appointment"}
                </Button>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
