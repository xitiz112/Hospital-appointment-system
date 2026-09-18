import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { clearStoredImage, replaceStoredImage, saveProfileImage } from "@/lib/storage";

async function loadDoctor(id: string) {
  return prisma.doctor.findUnique({
    where: { id },
    include: { user: true },
  });
}

function canManage(actor: { id: string; role: Role; doctor?: { id: string } | null } | null | undefined, doctorId: string) {
  if (!actor) return false;
  if (actor.role === Role.ADMIN) return true;
  if (actor.role === Role.DOCTOR && actor.doctor?.id === doctorId) return true;
  return false;
}

export const POST = apiHandler(async ({ req, user, params }) => {
  const doctor = await loadDoctor(params.id);
  if (!doctor) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  if (!canManage(user, doctor.id)) throw new ApiError("FORBIDDEN", "Not allowed", 403);
  const form = await req.formData();
  const file = form.get("file") ?? form.get("photo");
  if (!(file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", "Expected a file field named file or photo", 400);
  }
  const imageUrl = await saveProfileImage(file);
  await replaceStoredImage(doctor.user.imageUrl, imageUrl);
  const updated = await prisma.user.update({
    where: { id: doctor.userId },
    data: { imageUrl },
  });
  await writeAudit({
    actorId: user?.id,
    action: "DOCTOR_PHOTO_UPDATED",
    entity: "Doctor",
    entityId: doctor.id,
    payload: { imageUrl },
  });
  return jsonOk({ imageUrl: updated.imageUrl });
}, { auth: true });

export const DELETE = apiHandler(async ({ user, params }) => {
  const doctor = await loadDoctor(params.id);
  if (!doctor) throw new ApiError("NOT_FOUND", "Doctor not found", 404);
  if (!canManage(user, doctor.id)) throw new ApiError("FORBIDDEN", "Not allowed", 403);
  await clearStoredImage(doctor.user.imageUrl);
  await prisma.user.update({ where: { id: doctor.userId }, data: { imageUrl: null } });
  await writeAudit({
    actorId: user?.id,
    action: "DOCTOR_PHOTO_REMOVED",
    entity: "Doctor",
    entityId: doctor.id,
  });
  return jsonOk({ imageUrl: null });
}, { auth: true });

export const OPTIONS = POST;
