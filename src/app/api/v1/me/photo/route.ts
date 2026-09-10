import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { saveProfileImage } from "@/lib/storage";

export const POST = apiHandler(async ({ req, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const form = await req.formData();
  const file = form.get("file") ?? form.get("photo");
  if (!(file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", "Expected a file field named file or photo", 400);
  }
  const imageUrl = await saveProfileImage(file);
  await prisma.user.update({ where: { id: user.id }, data: { imageUrl } });
  return jsonOk({ imageUrl });
}, { auth: true });
