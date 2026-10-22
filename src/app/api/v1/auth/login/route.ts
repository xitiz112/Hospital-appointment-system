import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { issueTokenPair, publicUser } from "@/lib/tokens";
import { loginSchema } from "@/lib/validators";
import { LOGIN_LOCK_MINUTES, clearLoginFailures, clientIp, isLoginLocked, recordLoginFailure } from "@/lib/login-throttle";

export const POST = apiHandler(async ({ req }) => {
  const body = loginSchema.parse(await readJson(req));
  const email = body.email.toLowerCase();
  if (await isLoginLocked(email)) {
    throw new ApiError(
      "TOO_MANY_ATTEMPTS",
      `Too many failed sign-in attempts. Try again in ${LOGIN_LOCK_MINUTES} minutes.`,
      429,
    );
  }
  const user = await prisma.user.findUnique({
    where: { email },
    include: { patient: true, doctor: true },
  });
  const ok = user ? await verifyPassword(body.password, user.passwordHash) : false;
  if (!user || !ok) {
    await recordLoginFailure(email, clientIp(req));
    throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }
  await clearLoginFailures(email);
  const tokens = await issueTokenPair(user);
  return jsonOk({ user: publicUser(user), ...tokens });
});

export const OPTIONS = POST;
