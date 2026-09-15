import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";

export const POST = apiHandler(async ({ user }) => {
  await prisma.notification.updateMany({
    where: { userId: user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  return jsonOk({ read: true });
}, { auth: true });

export const OPTIONS = POST;
