import { NextRequest, NextResponse } from "next/server";
import { addHours } from "date-fns";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" }, meta: null },
      { status: 401 },
    );
  }

  const hours = Number(process.env.REMINDER_HOURS ?? 24);
  const now = new Date();
  const until = addHours(now, hours);

  const upcoming = await prisma.appointment.findMany({
    where: {
      reminderSentAt: null,
      startAt: { gte: now, lte: until },
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
    include: {
      patient: true,
      doctor: { include: { user: true } },
    },
  });

  let sent = 0;
  for (const appt of upcoming) {
    await notifyUser({
      userId: appt.patient.userId,
      type: "APPOINTMENT_REMINDER",
      title: "Upcoming appointment",
      body: `Reminder: you have an appointment with ${appt.doctor.user.name} soon.`,
      data: { appointmentId: appt.id, startAt: appt.startAt.toISOString() },
    });
    await notifyUser({
      userId: appt.doctor.userId,
      type: "APPOINTMENT_REMINDER",
      title: "Upcoming appointment",
      body: "You have an upcoming patient visit.",
      data: { appointmentId: appt.id },
    });
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });
    sent += 1;
  }

  return NextResponse.json({
    success: true,
    data: { reminded: sent, windowHours: hours },
    error: null,
    meta: null,
  });
}
