import { addMinutes, isBefore } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HOSPITAL_TZ } from "@/lib/serialize";

export type GeneratedSlot = {
  startAt: Date;
  endAt: Date;
  available: boolean;
};

function parseDateOnly(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("date must be YYYY-MM-DD");
  }
  return dateStr;
}

export function weekdayInZone(date: Date, tz = HOSPITAL_TZ) {
  return toZonedTime(date, tz).getDay();
}

export function localMinutesToUtc(dateStr: string, minutes: number, tz = HOSPITAL_TZ) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${dateStr}T${hh}:${mm}:00`, tz);
}

export function dayRangeUtc(dateStr: string, tz = HOSPITAL_TZ) {
  const start = fromZonedTime(`${dateStr}T00:00:00`, tz);
  const end = fromZonedTime(`${dateStr}T23:59:59.999`, tz);
  return { start, end };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export async function generateSlots(doctorId: string, dateStr: string, tz = HOSPITAL_TZ) {
  const date = parseDateOnly(dateStr);
  const weekday = weekdayInZone(fromZonedTime(`${date}T12:00:00`, tz), tz);
  const { start: dayStart, end: dayEnd } = dayRangeUtc(date, tz);

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      schedules: { where: { weekday } },
      breaks: { where: { weekday } },
      unavailability: {
        where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
      },
    },
  });
  if (!doctor) return [];

  const duration = doctor.appointmentDurationMin;
  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      startAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
    },
    select: { startAt: true, endAt: true },
  });

  const now = new Date();
  const slots: GeneratedSlot[] = [];

  for (const schedule of doctor.schedules) {
    for (let cursor = schedule.startMin; cursor + duration <= schedule.endMin; cursor += duration) {
      const startAt = localMinutesToUtc(date, cursor, tz);
      const endAt = addMinutes(startAt, duration);
      const inBreak = doctor.breaks.some((b) => cursor < b.endMin && cursor + duration > b.startMin);
      const inUnavail = doctor.unavailability.some((u) => overlaps(startAt, endAt, u.startAt, u.endAt));
      const occupied = booked.some((a) => overlaps(startAt, endAt, a.startAt, a.endAt));
      const past = isBefore(startAt, now);
      slots.push({
        startAt,
        endAt,
        available: !inBreak && !inUnavail && !occupied && !past && doctor.isAvailable,
      });
    }
  }

  slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return slots;
}

export async function assertSlotAvailable(doctorId: string, startAt: Date, tz = HOSPITAL_TZ) {
  const local = toZonedTime(startAt, tz);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  const slots = await generateSlots(doctorId, `${y}-${m}-${d}`, tz);
  const match = slots.find((s) => s.startAt.getTime() === startAt.getTime());
  if (!match) {
    return { ok: false as const, slot: null };
  }
  if (!match.available) {
    return { ok: false as const, slot: match };
  }
  return { ok: true as const, slot: match };
}

export const doctorPublicSelect = {
  id: true,
  qualifications: true,
  experienceYears: true,
  consultationFee: true,
  appointmentDurationMin: true,
  location: true,
  isAvailable: true,
  bio: true,
  hospital: { select: { id: true, name: true, timezone: true, address: true } },
  department: { select: { id: true, name: true } },
  specialization: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, imageUrl: true, status: true } },
  schedules: { select: { weekday: true, startMin: true, endMin: true } },
} satisfies Prisma.DoctorSelect;
