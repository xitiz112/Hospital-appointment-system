import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";

export const GET = apiHandler(async ({ req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const items = await prisma.payment.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      appointment: {
        include: {
          patient: { include: { user: { select: { name: true, email: true } } } },
          doctor: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });
  return jsonOk(items);
}, { auth: true, roles: [Role.ADMIN] });
