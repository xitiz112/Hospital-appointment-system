import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

async function sendFcm(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  const key = process.env.FCM_SERVER_KEY;
  if (!key || tokens.length === 0) return;
  try {
    await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title, body },
        data: data ?? {},
      }),
    });
  } catch (error) {
    console.warn("FCM send skipped/failed", error);
  }
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
