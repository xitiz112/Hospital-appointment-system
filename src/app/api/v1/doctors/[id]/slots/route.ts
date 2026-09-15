import { apiHandler, jsonOk, ApiError } from "@/lib/api";
import { generateSlots } from "@/lib/slots";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler(async ({ req, params }) => {
  const date = new URL(req.url).searchParams.get("date");
  if (!date) throw new ApiError("VALIDATION_ERROR", "Query param date=YYYY-MM-DD is required", 400);
  const doctor = await prisma.doctor.findUnique({ where: { id: params.id } });
  if (!doctor) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  const hospital = await prisma.hospital.findFirst();
  const slots = await generateSlots(params.id, date, hospital?.timezone);
  return jsonOk(
    slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      available: s.available,
    })),
  );
});

export const OPTIONS = GET;
