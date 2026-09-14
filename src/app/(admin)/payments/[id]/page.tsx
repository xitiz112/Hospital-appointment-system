import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CashPayButton } from "@/components/admin/cash-pay";
import { formatKtm, statusVariant } from "@/lib/format";

export default async function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      appointment: {
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, department: true } },
          hospital: true,
        },
      },
    },
  });
  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-lg border bg-white p-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Receipt</p>
        <h1 className="text-2xl font-semibold">{payment.appointment.hospital.name}</h1>
        <p className="text-sm text-muted-foreground">{payment.receiptNumber ?? "Unpaid — no receipt number yet"}</p>
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt>Patient</dt>
          <dd>{payment.appointment.patient.user.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Doctor</dt>
          <dd>{payment.appointment.doctor.user.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Department</dt>
          <dd>{payment.appointment.doctor.department.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Visit</dt>
          <dd>
            <Link className="text-primary hover:underline" href={`/appointments/${payment.appointmentId}`}>
              {formatKtm(payment.appointment.startAt)}
            </Link>
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Provider</dt>
          <dd>{payment.provider}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Status</dt>
          <dd>
            <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
          </dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Amount</dt>
          <dd>
            {payment.currency} {Number(payment.amount).toLocaleString()}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Paid at</dt>
          <dd>{payment.paidAt ? formatKtm(payment.paidAt) : "—"}</dd>
        </div>
      </dl>
      <CashPayButton id={payment.id} payable={payment.status !== "SUCCESS"} />
    </div>
  );
}
