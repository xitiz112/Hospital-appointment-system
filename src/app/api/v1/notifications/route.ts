import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";

export const GET = apiHandler(async ({ req, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const url = new URL(req.url);
  const unread = url.searchParams.get("unread");
  const items = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(unread === "true" ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
  return jsonOk(items, { unreadCount });
}, { auth: true });

export const OPTIONS = GET;
