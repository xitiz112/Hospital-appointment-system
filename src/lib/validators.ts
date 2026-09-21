import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Valid email is required"),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  // Accept common mobile field aliases
  password: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
}).transform((data, ctx) => {
  const password = data.password ?? data.newPassword;
  if (!password || password.length < 8) {
    ctx.addIssue({
      code: "custom",
      message: "Password must be at least 8 characters",
      path: ["password"],
    });
    return z.NEVER;
  }
  return { token: data.token, password };
});

export const patchMeSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  address: z.string().optional().nullable(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  qualifications: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const specializationSchema = z.object({
  name: z.string().trim().min(2),
  departmentId: z.string().optional().nullable(),
});

export const doctorCreateSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8).optional(),
  departmentId: z.string().min(1),
  specializationId: z.string().optional().nullable(),
  qualifications: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
  consultationFee: z.number().min(0),
  appointmentDurationMin: z.number().int().min(5).max(240).optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

export const doctorUpdateSchema = doctorCreateSchema.partial();

export const scheduleItemSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMin: z.number().int().min(0).max(24 * 60 - 1),
  endMin: z.number().int().min(1).max(24 * 60),
});

export const schedulesPutSchema = z.object({
  schedules: z.array(scheduleItemSchema),
  breaks: z
    .array(
      scheduleItemSchema.extend({
        label: z.string().optional(),
      }),
    )
    .optional(),
});

export const unavailabilitySchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  reason: z.string().optional(),
});

export const bookAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  startAt: z.string(),
  notes: z.string().optional(),
  patientId: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const rescheduleSchema = z.object({
  startAt: z.string(),
  reason: z.string().optional(),
});

export const statusSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "NO_SHOW"]),
});

export const initiatePaymentSchema = z.object({
  appointmentId: z.string().min(1),
  provider: z.enum(["ESEWA", "KHALTI"]),
});

export const verifyPaymentSchema = z.object({
  provider: z.enum(["ESEWA", "KHALTI"]),
  appointmentId: z.string().optional(),
  transactionUuid: z.string().optional(),
  pidx: z.string().optional(),
  data: z.string().optional(),
});

export const deviceTokenSchema = z.object({
  token: z.string().min(8),
  platform: z.string().optional(),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  timezone: z.string().optional(),
  cancellationHours: z.number().int().min(0).max(168).optional(),
  paymentRequired: z.boolean().optional(),
  defaultAppointmentDurationMin: z.number().int().min(5).max(240).optional(),
});

export const patientStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const adminPatientCreateSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8).optional(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  address: z.string().optional().nullable(),
});

export const adminPatientUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  address: z.string().optional().nullable(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  notifySms: z.boolean().optional(),
});

export const adminUserCreateSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8),
  role: z.enum(["ADMIN"]),
});

export const adminUserPatchSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  name: z.string().trim().min(2).optional(),
});
