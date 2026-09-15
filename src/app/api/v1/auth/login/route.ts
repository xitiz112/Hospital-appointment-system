import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { issueTokenPair, publicUser } from "@/lib/tokens";
import { loginSchema } from "@/lib/validators";

export const POST = apiHandler(async ({ req }) => {
  const body = loginSchema.parse(await readJson(req));
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { patient: true, doctor: true },
  });
  if (!user) throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  const tokens = await issueTokenPair(user);
  return jsonOk({ user: publicUser(user), ...tokens });
});

export const OPTIONS = POST;
