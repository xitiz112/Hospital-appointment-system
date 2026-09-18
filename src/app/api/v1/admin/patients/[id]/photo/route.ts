import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { clearStoredImage, isUploadFile, replaceStoredImage, saveProfileImage } from "@/lib/storage";

export const POST = apiHandler(async ({ req, user, params }) => {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!patient) throw new ApiError("NOT_FOUND", "Patient not found", 404);
  const form = await req.formData();
  const file = form.get("file") ?? form.get("photo");
  if (!isUploadFile(file)) {
    throw new ApiError("VALIDATION_ERROR", "Expected a file field named file or photo", 400);
  }
  const imageUrl = await saveProfileImage(file);
  await replaceStoredImage(patient.user.imageUrl, imageUrl);
  const updated = await prisma.user.update({
    where: { id: patient.userId },
    data: { imageUrl },
  });
  await writeAudit({
    actorId: user?.id,
    action: "PATIENT_PHOTO_UPDATED",
    entity: "Patient",
    entityId: patient.id,
    payload: { imageUrl },
  });
  return jsonOk({ imageUrl: updated.imageUrl });
}, { auth: true, roles: [Role.ADMIN] });

export const DELETE = apiHandler(async ({ user, params }) => {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!patient) throw new ApiError("NOT_FOUND", "Patient not found", 404);
  await clearStoredImage(patient.user.imageUrl);
  await prisma.user.update({ where: { id: patient.userId }, data: { imageUrl: null } });
  await writeAudit({
    actorId: user?.id,
    action: "PATIENT_PHOTO_REMOVED",
    entity: "Patient",
    entityId: patient.id,
  });
  return jsonOk({ imageUrl: null });
}, { auth: true, roles: [Role.ADMIN] });

export const OPTIONS = POST;
