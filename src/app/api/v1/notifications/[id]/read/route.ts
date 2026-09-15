import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";

export const PATCH = apiHandler(async ({ params, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const item = await prisma.notification.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!item) throw new ApiError("NOT_FOUND", "Notification not found", 404);
  const updated = await prisma.notification.update({
    where: { id: item.id },
    data: { readAt: new Date() },
  });
  return jsonOk(updated);
}, { auth: true });

export const OPTIONS = PATCH;
