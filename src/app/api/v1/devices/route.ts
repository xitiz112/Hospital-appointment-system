import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { deviceTokenSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req, user }) => {
  const body = deviceTokenSchema.parse(await readJson(req));
  const item = await prisma.deviceToken.upsert({
    where: { userId_token: { userId: user!.id, token: body.token } },
    update: { platform: body.platform },
    create: { userId: user!.id, token: body.token, platform: body.platform },
  });
  return jsonOk(item, undefined, 201);
}, { auth: true });

export const OPTIONS = POST;
