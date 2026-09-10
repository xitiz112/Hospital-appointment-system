import { addHours } from "date-fns";
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
import { assertSlotAvailable } from "@/lib/slots";
import type { CurrentUser } from "@/lib/auth";

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function getHospital() {
  const hospital = await prisma.hospital.findFirst();
  if (!hospital) throw new ApiError("HOSPITAL_NOT_FOUND", "Hospital is not configured", 500);
  return hospital;
}

export async function bookAppointment(user: CurrentUser, input: { doctorId: string; startAt: Date; notes?: string }) {
  if (user.role !== Role.PATIENT || !user.patient) {
    throw new ApiError("FORBIDDEN", "Only patients can book appointments", 403);
  }
  const hospital = await getHospital();
  const doctor = await prisma.doctor.findUnique({
    where: { id: input.doctorId },
    include: { user: true },
  });
  if (!doctor || !doctor.isAvailable || doctor.user.status !== "ACTIVE") {
    throw new ApiError("DOCTOR_UNAVAILABLE", "Doctor is not available for booking", 400);
  }

  const check = await assertSlotAvailable(doctor.id, input.startAt, hospital.timezone);
  if (!check.ok || !check.slot) {
    throw new ApiError("SLOT_UNAVAILABLE", "That slot is not available", 409);
  }

  const paymentRequired = hospital.paymentRequired;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          hospitalId: hospital.id,
          patientId: user.patient!.id,
          doctorId: doctor.id,
          startAt: check.slot!.startAt,
          endAt: check.slot!.endAt,
          status: paymentRequired ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED,
          notes: input.notes,
        },
        include: {
          doctor: { include: { user: true, department: true, specialization: true } },
          patient: { include: { user: true } },
          hospital: true,
        },
      });

      let payment = null;
      if (paymentRequired) {
        payment = await tx.payment.create({
          data: {
            appointmentId: appointment.id,
            amount: doctor.consultationFee,
            currency: "NPR",
            provider: PaymentProviderType.CASH,
            status: PaymentStatus.PENDING,
          },
        });
      }

      return { appointment, payment };
    });

    await writeAudit({
      actorId: user.id,
      action: "APPOINTMENT_BOOKED",
      entity: "Appointment",
      entityId: result.appointment.id,
      payload: { doctorId: doctor.id, startAt: check.slot.startAt.toISOString() },
    });

    await notifyUser({
      userId: user.id,
      type: paymentRequired ? "APPOINTMENT_BOOKED" : "APPOINTMENT_CONFIRMED",
      title: paymentRequired ? "Appointment pending payment" : "Appointment confirmed",
      body: `Your visit with ${doctor.user.name} is scheduled.`,
      data: { appointmentId: result.appointment.id },
    });
    await notifyUser({
      userId: doctor.userId,
      type: "APPOINTMENT_BOOKED",
      title: "New appointment",
      body: `${user.name} booked a slot.`,
      data: { appointmentId: result.appointment.id },
    });

    return {
      ...result,
      paymentRequired,
      needsPayment: paymentRequired,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new ApiError("SLOT_UNAVAILABLE", "That slot is not available", 409);
    }
    throw error;
  }
}

function canCancelWindow(user: CurrentUser, startAt: Date, cancellationHours: number) {
  if (user.role === Role.ADMIN) return true;
  return new Date() < addHours(startAt, -cancellationHours);
}

export async function cancelAppointment(
  user: CurrentUser,
  appointmentId: string,
  reason?: string,
) {
  const hospital = await getHospital();
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: { include: { user: true } } },
  });
  if (!appointment) throw new ApiError("NOT_FOUND", "Appointment not found", 404);

  if (user.role === Role.PATIENT && user.patient?.id !== appointment.patientId) {
    throw new ApiError("FORBIDDEN", "You can only cancel your own appointments", 403);
  }
  if (user.role === Role.DOCTOR && user.doctor?.id !== appointment.doctorId) {
    throw new ApiError("FORBIDDEN", "You can only cancel your own appointments", 403);
  }
  if (
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.RESCHEDULED ||
    appointment.status === AppointmentStatus.COMPLETED
  ) {
    throw new ApiError("INVALID_STATUS", "This appointment cannot be cancelled", 400);
  }
  if (!canCancelWindow(user, appointment.startAt, hospital.cancellationHours)) {
    throw new ApiError(
      "CANCELLATION_WINDOW",
      `Cancellations must be at least ${hospital.cancellationHours} hours before the visit`,
      400,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.CANCELLED },
    });
    await tx.appointmentCancellation.create({
      data: {
        appointmentId: appointment.id,
        cancelledById: user.id,
        reason,
      },
    });
    return row;
  });

  await writeAudit({
    actorId: user.id,
    action: "APPOINTMENT_CANCELLED",
    entity: "Appointment",
    entityId: appointment.id,
    payload: { reason: reason ?? null },
  });

  await notifyUser({
    userId: appointment.patient.userId,
    type: "APPOINTMENT_CANCELLED",
    title: "Appointment cancelled",
    body: "Your appointment was cancelled.",
    data: { appointmentId: appointment.id },
  });
  await notifyUser({
    userId: appointment.doctor.userId,
    type: "APPOINTMENT_CANCELLED",
    title: "Appointment cancelled",
    body: "An appointment was cancelled.",
    data: { appointmentId: appointment.id },
  });

  return updated;
}

export async function rescheduleAppointment(
  user: CurrentUser,
  appointmentId: string,
  startAt: Date,
  reason?: string,
) {
  const hospital = await getHospital();
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: { include: { user: true } }, payments: true },
  });
  if (!appointment) throw new ApiError("NOT_FOUND", "Appointment not found", 404);

  if (user.role === Role.PATIENT && user.patient?.id !== appointment.patientId) {
    throw new ApiError("FORBIDDEN", "You can only reschedule your own appointments", 403);
  }
  if (user.role === Role.DOCTOR && user.doctor?.id !== appointment.doctorId) {
    throw new ApiError("FORBIDDEN", "You can only reschedule your own appointments", 403);
  }
  if (
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.RESCHEDULED ||
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.NO_SHOW
  ) {
    throw new ApiError("INVALID_STATUS", "This appointment cannot be rescheduled", 400);
  }
  if (!canCancelWindow(user, appointment.startAt, hospital.cancellationHours)) {
    throw new ApiError(
      "CANCELLATION_WINDOW",
      `Reschedules must be at least ${hospital.cancellationHours} hours before the visit`,
      400,
    );
  }

  const check = await assertSlotAvailable(appointment.doctorId, startAt, hospital.timezone);
  if (!check.ok || !check.slot) {
    throw new ApiError("SLOT_UNAVAILABLE", "That slot is not available", 409);
  }

  const paid = appointment.payments.some((p) => p.status === PaymentStatus.SUCCESS);
  const newStatus =
    hospital.paymentRequired && !paid ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.RESCHEDULED },
      });
      const next = await tx.appointment.create({
        data: {
          hospitalId: appointment.hospitalId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          startAt: check.slot!.startAt,
          endAt: check.slot!.endAt,
          status: newStatus,
          notes: appointment.notes,
        },
        include: {
          doctor: { include: { user: true, department: true } },
          patient: { include: { user: true } },
        },
      });
      await tx.appointmentReschedule.create({
        data: {
          fromAppointmentId: appointment.id,
          toAppointmentId: next.id,
          actorId: user.id,
          reason,
        },
      });
      return next;
    });

    await writeAudit({
      actorId: user.id,
      action: "APPOINTMENT_RESCHEDULED",
      entity: "Appointment",
      entityId: result.id,
      payload: { from: appointment.id, startAt: check.slot.startAt.toISOString() },
    });

    await notifyUser({
      userId: appointment.patient.userId,
      type: "APPOINTMENT_RESCHEDULED",
      title: "Appointment rescheduled",
      body: "Your appointment was moved to a new time.",
      data: { appointmentId: result.id },
    });
    await notifyUser({
      userId: appointment.doctor.userId,
      type: "APPOINTMENT_RESCHEDULED",
      title: "Appointment rescheduled",
      body: "An appointment was moved to a new time.",
      data: { appointmentId: result.id },
    });

    return result;
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new ApiError("SLOT_UNAVAILABLE", "That slot is not available", 409);
    }
    throw error;
  }
}

const allowedTransitions: Record<string, AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.CONFIRMED],
  CONFIRMED: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW],
};

export async function updateAppointmentStatus(
  user: CurrentUser,
  appointmentId: string,
  status: AppointmentStatus,
) {
  if (user.role !== Role.ADMIN && user.role !== Role.DOCTOR) {
    throw new ApiError("FORBIDDEN", "Only doctors or admins can update status", 403);
  }
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new ApiError("NOT_FOUND", "Appointment not found", 404);
  if (user.role === Role.DOCTOR && user.doctor?.id !== appointment.doctorId) {
    throw new ApiError("FORBIDDEN", "You can only update your own appointments", 403);
  }
  const allowed = allowedTransitions[appointment.status] ?? [];
  if (!allowed.includes(status)) {
    throw new ApiError("INVALID_STATUS", `Cannot change ${appointment.status} to ${status}`, 400);
  }
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });
  await writeAudit({
    actorId: user.id,
    action: "APPOINTMENT_STATUS",
    entity: "Appointment",
    entityId: appointmentId,
    payload: { from: appointment.status, to: status },
  });
  return updated;
}
