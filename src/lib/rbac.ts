import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";

export function canManageDoctor(user: CurrentUser, doctorUserId: string) {
  return user.role === Role.ADMIN || (user.role === Role.DOCTOR && user.id === doctorUserId);
}

export function assertPatientOwn(user: CurrentUser, patientId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.PATIENT || user.patient?.id !== patientId) {
    throw new ApiError("FORBIDDEN", "You can only access your own patient records", 403);
  }
}

export function assertDoctorOwn(user: CurrentUser, doctorId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.DOCTOR || user.doctor?.id !== doctorId) {
    throw new ApiError("FORBIDDEN", "You can only access your own doctor records", 403);
  }
}

export function scopedAppointmentWhere(user: CurrentUser) {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.DOCTOR && user.doctor) {
    return { doctorId: user.doctor.id };
  }
  if (user.role === Role.PATIENT && user.patient) {
    return { patientId: user.patient.id };
  }
  throw new ApiError("FORBIDDEN", "No profile is linked to this account", 403);
}
