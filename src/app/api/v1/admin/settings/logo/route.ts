import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { getHospital } from "@/lib/appointments";
import { writeAudit } from "@/lib/audit";
import {
  clearStoredImage,
  isUploadFile,
  replaceStoredImage,
  saveHospitalLogo,
} from "@/lib/storage";

export const POST = apiHandler(async ({ req, user }) => {
  const hospital = await getHospital();
  const form = await req.formData();
  const file = form.get("file") ?? form.get("logo") ?? form.get("photo");
  if (!isUploadFile(file)) {
    throw new ApiError("VALIDATION_ERROR", "Expected a file field named file, logo, or photo", 400);
  }
  const logoUrl = await saveHospitalLogo(file);
  await replaceStoredImage(hospital.logoUrl, logoUrl);
  const updated = await prisma.hospital.update({
    where: { id: hospital.id },
    data: { logoUrl },
  });
  await writeAudit({
    actorId: user?.id,
    action: "HOSPITAL_LOGO_UPDATED",
    entity: "Hospital",
    entityId: hospital.id,
    payload: { logoUrl },
  });
  return jsonOk({ logoUrl: updated.logoUrl });
}, { auth: true, roles: [Role.ADMIN] });

export const DELETE = apiHandler(async ({ user }) => {
  const hospital = await getHospital();
  await clearStoredImage(hospital.logoUrl);
  const updated = await prisma.hospital.update({
    where: { id: hospital.id },
    data: { logoUrl: null },
  });
  await writeAudit({
    actorId: user?.id,
    action: "HOSPITAL_LOGO_REMOVED",
    entity: "Hospital",
    entityId: hospital.id,
  });
  return jsonOk({ logoUrl: updated.logoUrl });
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = POST;
