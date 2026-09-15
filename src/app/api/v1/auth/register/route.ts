import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { issueTokenPair, publicUser } from "@/lib/tokens";
import { registerSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export const POST = apiHandler(async ({ req }) => {
  const body = registerSchema.parse(await readJson(req));
  const email = body.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, ...(body.phone ? [{ phone: body.phone }] : [])],
    },
  });
  if (existing) {
    throw new ApiError("EMAIL_TAKEN", "An account with this email or phone already exists", 409);
  }

  const user = await prisma.user.create({
    data: {
      email,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      name: body.name,
      role: Role.PATIENT,
      patient: {
        create: {
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          gender: body.gender,
          address: body.address,
        },
      },
    },
    include: { patient: true },
  });

  await writeAudit({
    actorId: user.id,
    action: "USER_REGISTERED",
    entity: "User",
    entityId: user.id,
  });

  const tokens = await issueTokenPair(user);
  return jsonOk({ user: publicUser(user), ...tokens }, undefined, 201);
});

export const OPTIONS = POST;
