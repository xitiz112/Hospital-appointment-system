import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { clearStoredImage, isUploadFile, replaceStoredImage, saveProfileImage } from "@/lib/storage";

async function readImageFile(req: Request) {
  const form = await req.formData();
  const file = form.get("file") ?? form.get("photo");
  if (!isUploadFile(file)) {
    throw new ApiError("VALIDATION_ERROR", "Expected a file field named file or photo", 400);
  }
  return file;
}

export const POST = apiHandler(async ({ req, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const file = await readImageFile(req);
  const imageUrl = await saveProfileImage(file);
  await replaceStoredImage(user.imageUrl, imageUrl);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { imageUrl },
  });
  return jsonOk({ imageUrl: updated.imageUrl });
}, { auth: true });

export const DELETE = apiHandler(async ({ user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  await clearStoredImage(user.imageUrl);
  await prisma.user.update({ where: { id: user.id }, data: { imageUrl: null } });
  return jsonOk({ imageUrl: null });
}, { auth: true });

export const OPTIONS = POST;
