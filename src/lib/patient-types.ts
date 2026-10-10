import { formatInTimeZone } from "date-fns-tz";
import { HOSPITAL_TZ } from "@/lib/serialize";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

export type PaymentStatus = "PENDING" | "INITIATED" | "SUCCESS" | "FAILED" | "REFUNDED";

export type Hospital = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  timezone: string;
  cancellationHours: number;
  paymentRequired: boolean;
};

export type Department = { id: string; name: string; description: string | null; _count?: { doctors: number } };

export type Specialization = { id: string; name: string; department: { id: string; name: string } | null };

export type DoctorSummary = {
  id: string;
  qualifications: string | null;
  experienceYears: number;
  consultationFee: number;
  appointmentDurationMin: number;
  location: string | null;
  isAvailable: boolean;
  bio: string | null;
  hospital: { id: string; name: string; address: string | null };
  department: { id: string; name: string };
  specialization: { id: string; name: string } | null;
  user: { id: string; name: string; imageUrl: string | null };
  schedules: { weekday: number; startMin: number; endMin: number }[];
};

export type DoctorProfile = DoctorSummary & {
  breaks: { weekday: number; startMin: number; endMin: number; label: string | null }[];
};

export type Slot = { startAt: string; endAt: string; available: boolean };

export type Payment = {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  provider: "ESEWA" | "KHALTI" | "CASH";
  status: PaymentStatus;
  receiptNumber: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  doctor: {
    id: string;
    consultationFee: number;
    qualifications: string | null;
    location?: string | null;
    department: { name: string };
    specialization?: { name: string } | null;
    user: { name: string; imageUrl: string | null };
  };
  payments?: Payment[];
  cancellation?: { reason: string | null; createdAt: string } | null;
  hospital?: Hospital;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type Receipt = {
  receiptNumber: string;
  amount: number;
  currency: string;
  provider: string;
  paidAt: string;
  hospital: string;
  patient: string;
  doctor: string;
  department: string;
  appointmentStart: string;
};

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatNpr(amount: number | string) {
  return `NPR ${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Today's calendar date in Kathmandu as YYYY-MM-DD. */
export function todayKtm() {
  return formatInTimeZone(new Date(), HOSPITAL_TZ, "yyyy-MM-dd");
}

/** The next `count` Kathmandu calendar dates starting today. */
export function upcomingDates(count: number) {
  const base = new Date(`${todayKtm()}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    return {
      value: d.toISOString().slice(0, 10),
      weekday: d.getUTCDay(),
      day: d.getUTCDate(),
      month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    };
  });
}

/** The most recent successful payment, else the latest attempt. */
export function primaryPayment(payments: Payment[] = []) {
  const success = payments.find((p) => p.status === "SUCCESS");
  if (success) return success;
  return [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function needsPayment(appointment: Appointment) {
  if (appointment.status !== "PENDING") return false;
  if (new Date(appointment.startAt) <= new Date()) return false;
  if (Number(appointment.doctor.consultationFee) <= 0) return false;
  if (appointment.hospital && !appointment.hospital.paymentRequired) return false;
  return !(appointment.payments ?? []).some((p) => p.status === "SUCCESS");
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  NO_SHOW: "Missed",
};
