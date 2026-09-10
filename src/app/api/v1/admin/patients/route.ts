import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";

export const GET = apiHandler(async ({ req }) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: { user: { select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return jsonOk(patients);
}, { auth: true, roles: [Role.ADMIN] });
