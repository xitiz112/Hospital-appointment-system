"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, Receipt, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/patient-client";
import { formatKtm } from "@/lib/format";
import {
  formatNpr,
  needsPayment,
  primaryPayment,
  type Appointment,
  type DoctorProfile,
} from "@/lib/patient-types";
import { SlotChooser } from "@/components/patient/slot-chooser";
import { Avatar, ErrorNote, Loading, Panel, StatusBadge, useApi } from "@/components/patient/ui";

type InitiateResult = {
  provider: string;
  payload: { formUrl: string; method: string; fields: Record<string, string> };
};

/** eSewa v2 expects a browser form POST to its hosted page. */
function submitGatewayForm(formUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = formUrl;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function AppointmentDetail({ id, justBooked }: { id: string; justBooked: boolean }) {
  const router = useRouter();
  const appointment = useApi<Appointment>(`/api/v1/appointments/${id}`);
  const [mode, setMode] = useState<"idle" | "reschedule" | "cancel">("idle");
  const [busy, setBusy] = useState<"pay" | "cancel" | "reschedule" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState<string | null>(null);

  const doctorId = appointment.data?.doctor.id;
  const doctor = useApi<DoctorProfile>(mode === "reschedule" && doctorId ? `/api/v1/doctors/${doctorId}` : null);

  if (appointment.loading && !appointment.data) return <Loading label="Loading appointment…" />;
  if (!appointment.data) {
    return <ErrorNote message={appointment.error ?? "Appointment not found"} onRetry={appointment.reload} />;
  }

  const a = appointment.data;
  const fee = Number(a.doctor.consultationFee);
  const payment = primaryPayment(a.payments);
  const unpaid = needsPayment(a);
  const upcoming = new Date(a.startAt) > new Date();
  const changeable = upcoming && (a.status === "PENDING" || a.status === "CONFIRMED");
  const cancellationHours = a.hospital?.cancellationHours ?? 24;
  const deadline = new Date(new Date(a.startAt).getTime() - cancellationHours * 60 * 60 * 1000);
  const withinWindow = new Date() < deadline;

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      const { data } = await api<InitiateResult>("/api/v1/payments/initiate", {
        method: "POST",
        body: { appointmentId: a.id, provider: "ESEWA" },
      });
      submitGatewayForm(data.payload.formUrl, data.payload.fields);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    try {
      await api(`/api/v1/appointments/${a.id}/cancel`, {
        method: "POST",
        body: { reason: reason.trim() || undefined },
      });
      setMode("idle");
      setReason("");
      appointment.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function reschedule() {
    if (!newStart) return;
    setBusy("reschedule");
    setError(null);
    try {
      const { data } = await api<{ id: string }>(`/api/v1/appointments/${a.id}/reschedule`, {
        method: "POST",
        body: { startAt: newStart, reason: reason.trim() || undefined },
      });
      router.replace(`/portal/appointments/${data.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/portal/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        All appointments
      </Link>

      {justBooked ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p>
            {unpaid
              ? "Your slot is held. Pay now to confirm the appointment."
              : "You're booked. We've added it to your appointments and notifications."}
          </p>
        </div>
      ) : null}

      <Panel>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={a.doctor.user.name} src={a.doctor.user.imageUrl} className="h-16 w-16" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{a.doctor.user.name}</h1>
              <p className="text-sm text-muted-foreground">
                {a.doctor.specialization?.name ?? a.doctor.department.name}
                {a.doctor.qualifications ? ` · ${a.doctor.qualifications}` : ""}
              </p>
              <Link href={`/portal/doctors/${a.doctor.id}`} className="mt-1 inline-block text-xs font-medium text-accent hover:underline">
                View doctor profile
              </Link>
            </div>
          </div>
          <StatusBadge status={a.status} />
        </div>

        <dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="mt-0.5 font-semibold">{formatKtm(a.startAt, "EEEE, d MMMM yyyy")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Time (NPT)</dt>
            <dd className="mt-0.5 font-semibold">
              {formatKtm(a.startAt, "h:mm a")} – {formatKtm(a.endAt, "h:mm a")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Fee</dt>
            <dd className="mt-0.5 font-semibold">{fee > 0 ? formatNpr(fee) : "Free"}</dd>
          </div>
        </dl>
        {a.doctor.location || a.hospital?.address ? (
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {[a.doctor.location, a.hospital?.name, a.hospital?.address].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {a.notes ? (
          <div className="mt-4 rounded-lg bg-secondary/60 px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground">Your note</p>
            <p className="mt-1 whitespace-pre-wrap">{a.notes}</p>
          </div>
        ) : null}
      </Panel>

      {error ? <ErrorNote message={error} /> : null}

      {unpaid ? (
        <Panel className="border-amber-200 bg-amber-50/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Payment needed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pay {formatNpr(fee)} to confirm. You&apos;ll be taken to eSewa and brought back here.
                {payment?.status === "FAILED" ? " Your last attempt didn't go through — you can try again." : ""}
              </p>
            </div>
            <Button size="lg" onClick={pay} disabled={busy !== null} className="bg-[#41a124] hover:bg-[#368a1e]">
              {busy === "pay" ? "Opening eSewa…" : "Pay with eSewa"}
            </Button>
          </div>
        </Panel>
      ) : null}

      {payment?.status === "SUCCESS" ? (
        <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Receipt className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="font-semibold">Paid {formatNpr(payment.amount)}</h2>
              <p className="text-sm text-muted-foreground">
                {payment.provider === "CASH" ? "Paid at the hospital" : `Paid via ${payment.provider === "ESEWA" ? "eSewa" : "Khalti"}`}
                {payment.paidAt ? ` on ${formatKtm(payment.paidAt, "d MMM yyyy")}` : ""}
                {payment.receiptNumber ? ` · ${payment.receiptNumber}` : ""}
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href={`/portal/receipts/${payment.id}`}>View receipt</Link>
          </Button>
        </Panel>
      ) : null}

      {a.status === "CANCELLED" ? (
        <Panel className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="text-sm">
            <h2 className="font-semibold">This appointment was cancelled</h2>
            {a.cancellation?.reason ? <p className="mt-1 text-muted-foreground">Reason: {a.cancellation.reason}</p> : null}
            <Link href={`/portal/doctors/${a.doctor.id}`} className="mt-2 inline-block font-medium text-accent hover:underline">
              Book a new time with this doctor
            </Link>
          </div>
        </Panel>
      ) : null}

      {a.status === "RESCHEDULED" ? (
        <Panel className="flex items-start gap-3 text-sm">
          <CalendarClock className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">This booking was moved to a new time</h2>
            <Link href="/portal/appointments" className="mt-1 inline-block font-medium text-accent hover:underline">
              See your current appointments
            </Link>
          </div>
        </Panel>
      ) : null}

      {changeable ? (
        <Panel className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Need to change plans?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {withinWindow
                  ? `You can reschedule or cancel until ${formatKtm(deadline, "d MMM, h:mm a")}.`
                  : `Changes close ${cancellationHours} hours before the visit. Please call the hospital to make changes.`}
              </p>
            </div>
            {withinWindow && mode === "idle" ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode("reschedule")}>
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-destructive hover:bg-red-50"
                  onClick={() => setMode("cancel")}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>

          {mode === "reschedule" ? (
            <div className="space-y-4 border-t pt-4">
              {doctor.loading || !doctor.data ? (
                doctor.error ? <ErrorNote message={doctor.error} /> : <p className="text-sm text-muted-foreground">Loading schedule…</p>
              ) : (
                <SlotChooser
                  doctorId={a.doctor.id}
                  schedules={doctor.data.schedules}
                  value={newStart}
                  onChange={setNewStart}
                  excludeStartAt={a.startAt}
                />
              )}
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rescheduling (optional)"
                rows={2}
                maxLength={300}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode("idle");
                    setNewStart(null);
                  }}
                >
                  Keep current time
                </Button>
                <Button onClick={reschedule} disabled={!newStart || busy !== null}>
                  {busy === "reschedule"
                    ? "Moving…"
                    : newStart
                      ? `Move to ${formatKtm(newStart, "d MMM, h:mm a")}`
                      : "Pick a new time"}
                </Button>
              </div>
            </div>
          ) : null}

          {mode === "cancel" ? (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm">
                Cancel your visit on <strong>{formatKtm(a.startAt, "d MMM 'at' h:mm a")}</strong>? This frees the slot
                for other patients.
                {payment?.status === "SUCCESS" ? " Contact the hospital about your refund." : ""}
              </p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                rows={2}
                maxLength={300}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode("idle")}>
                  Keep appointment
                </Button>
                <Button variant="destructive" onClick={cancel} disabled={busy !== null}>
                  {busy === "cancel" ? "Cancelling…" : "Cancel appointment"}
                </Button>
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
