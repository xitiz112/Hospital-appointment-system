import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";

export const GET = apiHandler(async () => {
  const hospital = await prisma.hospital.findFirst();
  if (!hospital) throw new ApiError("HOSPITAL_NOT_FOUND", "Hospital is not configured", 404);
  return jsonOk(hospital);
});

export const OPTIONS = GET;
