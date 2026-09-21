import {
  AppointmentStatus,
  PaymentProviderType,
  PaymentStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { esewaProvider, khaltiProvider } from "@/lib/payments";
import type { CurrentUser } from "@/lib/auth";
import { randomUUID } from "crypto";

function providerFor(kind: "ESEWA" | "KHALTI") {
  return kind === "ESEWA" ? esewaProvider : khaltiProvider;
}

async function nextReceiptNumber() {
  const day = new Date();
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  const prefix = `HAS-${y}${m}${d}-`;
  const count = await prisma.payment.count({
    where: { receiptNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

export async function initiatePayment(
  user: CurrentUser,
  appointmentId: string,
  _requestedProvider: "ESEWA" | "KHALTI" = "ESEWA",
) {
  // Khalti is disabled for now — always initiate via eSewa.
  const provider = "ESEWA" as const;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: { include: { user: true } }, payments: true },
  });
  if (!appointment) throw new ApiError("NOT_FOUND", "Appointment not found", 404);
  if (user.role === Role.PATIENT && user.patient?.id !== appointment.patientId) {
    throw new ApiError("FORBIDDEN", "You can only pay for your own appointments", 403);
  }
  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw new ApiError("INVALID_STATUS", "Cannot pay for a cancelled appointment", 400);
  }
  const amount = Number(appointment.doctor.consultationFee);
  const transactionUuid = randomUUID();
  const existing =
    appointment.payments.find((p) => p.status !== PaymentStatus.SUCCESS) ??
    (await prisma.payment.create({
      data: {
        appointmentId,
        amount,
        provider: PaymentProviderType.ESEWA,
        status: PaymentStatus.PENDING,
      },
    }));

  const payment = await prisma.payment.update({
    where: { id: existing.id },
    data: {
      provider: PaymentProviderType.ESEWA,
      status: PaymentStatus.INITIATED,
      gatewayRef: transactionUuid,
      metadata: { transactionUuid },
    },
  });

  const result = await providerFor(provider).initiate({
    appointment,
    amount,
    transactionUuid,
    purchaseOrderName: `Consultation with ${appointment.doctor.user.name}`,
  });

  return { payment, ...result };
}

async function markPaid(paymentId: string, gatewayTxnId?: string) {
  const current = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { appointment: { include: { patient: true, doctor: true } } },
  });
  if (!current) throw new ApiError("NOT_FOUND", "Payment not found", 404);
  if (current.status === PaymentStatus.SUCCESS) return current;

  const blocked: AppointmentStatus[] = [
    AppointmentStatus.CANCELLED,
    AppointmentStatus.RESCHEDULED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
  ];
  if (blocked.includes(current.appointment.status)) {
    throw new ApiError("INVALID_STATUS", "Cannot record payment for this appointment", 400);
  }

  const receiptNumber = await nextReceiptNumber();
  const payment = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayTxnId: gatewayTxnId ?? null,
        receiptNumber,
        paidAt: new Date(),
      },
      include: {
        appointment: { include: { patient: true, doctor: true } },
      },
    });
    await tx.appointment.update({
      where: { id: updated.appointmentId },
      data: { status: AppointmentStatus.CONFIRMED },
    });
    return updated;
  });

  await notifyUser({
    userId: payment.appointment.patient.userId,
    type: "PAYMENT_SUCCESS",
    title: "Payment received",
    body: `Receipt ${receiptNumber} — your appointment is confirmed.`,
    data: { paymentId, appointmentId: payment.appointmentId, receiptNumber },
  });
  await notifyUser({
    userId: payment.appointment.patient.userId,
    type: "APPOINTMENT_CONFIRMED",
    title: "Appointment confirmed",
    body: "Payment succeeded and your appointment is confirmed.",
    data: { appointmentId: payment.appointmentId },
  });
  await notifyUser({
    userId: payment.appointment.doctor.userId,
    type: "APPOINTMENT_CONFIRMED",
    title: "Appointment confirmed",
    body: "Payment succeeded and the appointment is confirmed.",
    data: { appointmentId: payment.appointmentId },
  });
  return payment;
}

export async function verifyPayment(input: {
  provider: "ESEWA" | "KHALTI";
  appointmentId?: string;
  transactionUuid?: string;
  pidx?: string;
}) {
  const where: Prisma.PaymentWhereInput = {};
  if (input.appointmentId) where.appointmentId = input.appointmentId;
  if (input.pidx) where.gatewayRef = input.pidx;
  if (input.transactionUuid) where.gatewayRef = input.transactionUuid;
  const payment = await prisma.payment.findFirst({
    where,
    include: { appointment: { include: { doctor: true, patient: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);

  const amount = Number(payment.amount).toFixed(2);
  const result = await providerFor(input.provider).verify({
    transactionUuid: input.transactionUuid ?? (payment.metadata as { transactionUuid?: string } | null)?.transactionUuid,
    totalAmount: amount,
    pidx: input.pidx ?? payment.gatewayRef ?? undefined,
  });

  if (!result.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, metadata: result.raw as Prisma.InputJsonValue },
    });
    await notifyUser({
      userId: payment.appointment.patient.userId,
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      body: "We could not confirm your payment. The appointment is still pending.",
      data: { paymentId: payment.id },
    });
    return { payment: { ...payment, status: PaymentStatus.FAILED }, verified: false };
  }

  const paid = await markPaid(payment.id, result.gatewayTxnId);
  return { payment: paid, verified: true };
}

export async function markCashPaid(user: CurrentUser, paymentId: string) {
  if (user.role !== Role.ADMIN) {
    throw new ApiError("FORBIDDEN", "Only admins can mark cash payments", 403);
  }
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { appointment: { include: { patient: true } } },
  });
  if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);
  const paid = await markPaid(payment.id, "CASH");
  await prisma.payment.update({
    where: { id: paid.id },
    data: { provider: PaymentProviderType.CASH },
  });
  await writeAudit({
    actorId: user.id,
    action: "PAYMENT_CASH",
    entity: "Payment",
    entityId: paid.id,
  });
  return paid;
}
