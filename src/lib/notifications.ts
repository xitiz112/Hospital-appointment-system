import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const INVALID_FCM_ERRORS = new Set([
  "NotRegistered",
  "InvalidRegistration",
  "MismatchSenderId",
  "InvalidPackageName",
]);

function stringifyData(data?: Record<string, unknown>) {
  if (!data) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    out[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return out;
}

async function sendFcm(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  const key = process.env.FCM_SERVER_KEY?.trim();
  if (!key || tokens.length === 0) return;

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title, body },
        data: stringifyData(data),
        priority: "high",
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | { results?: Array<{ error?: string; message_id?: string }> }
      | null;

    if (!res.ok) {
      console.warn("FCM HTTP error", res.status, json);
      return;
    }

    const stale: string[] = [];
    json?.results?.forEach((result, index) => {
      if (result.error && INVALID_FCM_ERRORS.has(result.error)) {
        const token = tokens[index];
        if (token) stale.push(token);
      }
    });
    if (stale.length > 0) {
      await prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
    }
  } catch (error) {
    console.warn("FCM send skipped/failed", error);
  }
}

async function pushAllowed(userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { notifyPush: true },
  });
  // Doctors/admins have no notifyPush flag — always allow. Patients respect preference.
  if (patient) return patient.notifyPush;
  return true;
}

export async function notifyUser(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  if (!(await pushAllowed(input.userId))) {
    return notification;
  }

  const devices = await prisma.deviceToken.findMany({
    where: { userId: input.userId },
    select: { token: true },
  });
  await sendFcm(
    devices.map((d) => d.token),
    input.title,
    input.body,
    input.data,
  );
  return notification;
}
