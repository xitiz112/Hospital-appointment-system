import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";

export const GET = apiHandler(async ({ req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const items = await prisma.appointment.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { startAt: "desc" },
    take: 100,
    include: {
      doctor: { include: { user: { select: { name: true } } } },
      patient: { include: { user: { select: { name: true, email: true } } } },
      payments: true,
    },
  });
  return jsonOk(items);
}, { auth: true, roles: [Role.ADMIN] });
