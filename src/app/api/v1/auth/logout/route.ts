import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, readJson } from "@/lib/api";
import { hashToken } from "@/lib/jwt";
import { z } from "zod";

const schema = z.object({ refreshToken: z.string().min(10) });

export const POST = apiHandler(async ({ req }) => {
  const body = schema.parse(await readJson(req));
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(body.refreshToken) },
    data: { revokedAt: new Date() },
  });
  return jsonOk({ loggedOut: true });
}, { auth: true });
