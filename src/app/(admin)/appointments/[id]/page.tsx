import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { CashPayButton } from "@/components/admin/cash-pay";
import { RescheduleForm } from "@/components/admin/reschedule-form";
import { hasSuccessfulPayment, requiresSuccessfulPayment } from "@/lib/appointments";
import { formatKtm, statusVariant } from "@/lib/format";

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: { include: { user: true, department: true } },
      patient: { include: { user: true } },
      payments: true,
      cancellation: true,
    },
  });
  if (!appointment) notFound();
  const hospital = await prisma.hospital.findFirst();
  const paymentRequired = hospital?.paymentRequired ?? true;
  const paid = hasSuccessfulPayment(appointment.payments);
  const awaitingPayment =
    requiresSuccessfulPayment(paymentRequired, appointment.doctor.consultationFee) && !paid;
  const canReschedule = ["PENDING", "CONFIRMED"].includes(appointment.status);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Appointment</h1>
          <p className="text-sm text-muted-foreground">{formatKtm(appointment.startAt)}</p>
        </div>
        <Badge variant={statusVariant(appointment.status)}>{appointment.status}</Badge>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Patient</dt>
          <dd>
            <Link className="text-primary hover:underline" href={`/patients/${appointment.patientId}`}>
              {appointment.patient.user.name}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Doctor</dt>
          <dd>
            <Link className="text-primary hover:underline" href={`/doctors/${appointment.doctorId}`}>
              {appointment.doctor.user.name}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Department</dt>
          <dd>{appointment.doctor.department.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Notes</dt>
          <dd>{appointment.notes || "—"}</dd>
        </div>
        {appointment.cancellation ? (
          <div>
            <dt className="text-muted-foreground">Cancellation</dt>
            <dd>
              {formatKtm(appointment.cancellation.cancelledAt)} · {appointment.cancellation.reason ?? "No reason"}
            </dd>
          </div>
        ) : null}
      </dl>
      <AppointmentActions
        id={appointment.id}
        status={appointment.status}
        canConfirm={!awaitingPayment}
        awaitingPayment={awaitingPayment}
      />
      {awaitingPayment ? (
        <p className="text-sm text-muted-foreground">
          This visit stays pending until eSewa, Khalti, or cash payment succeeds. Staff cannot
          confirm it while unpaid.
        </p>
      ) : null}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Payments</h2>
        {appointment.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment required for this visit.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {appointment.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3">
                <span>
                  {p.provider} · {p.status} · NPR {Number(p.amount).toLocaleString()}
                  {p.receiptNumber ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link className="text-primary hover:underline" href={`/payments/${p.id}`}>
                        {p.receiptNumber}
                      </Link>
                    </>
                  ) : (
                    <>
                      {" "}
                      ·{" "}
                      <Link className="text-primary hover:underline" href={`/payments/${p.id}`}>
                        View
                      </Link>
                    </>
                  )}
                </span>
                <CashPayButton id={p.id} payable={p.status !== "SUCCESS"} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {canReschedule ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Reschedule</h2>
          <RescheduleForm appointmentId={appointment.id} doctorId={appointment.doctorId} />
        </div>
      ) : null}
    </div>
  );
}
