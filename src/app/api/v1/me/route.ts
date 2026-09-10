import { prisma } from "@/lib/prisma";
import { ApiError, apiHandler, jsonOk, readJson } from "@/lib/api";
import { publicUser } from "@/lib/tokens";
import { patchMeSchema } from "@/lib/validators";
import { Role } from "@prisma/client";

export const GET = apiHandler(async ({ user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  return jsonOk(publicUser(user));
}, { auth: true });

export const PATCH = apiHandler(async ({ req, user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  const body = patchMeSchema.parse(await readJson(req));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name,
      phone: body.phone === undefined ? undefined : body.phone,
    },
  });

  if (user.role === Role.PATIENT && user.patient) {
    await prisma.patient.update({
      where: { id: user.patient.id },
      data: {
        dateOfBirth:
          body.dateOfBirth === undefined
            ? undefined
            : body.dateOfBirth
              ? new Date(body.dateOfBirth)
              : null,
        gender: body.gender === undefined ? undefined : body.gender,
        address: body.address === undefined ? undefined : body.address,
        notifyEmail: body.notifyEmail,
        notifyPush: body.notifyPush,
        notifySms: body.notifySms,
      },
    });
  }

  if (user.role === Role.DOCTOR && user.doctor) {
    await prisma.doctor.update({
      where: { id: user.doctor.id },
      data: {
        qualifications: body.qualifications,
        bio: body.bio,
        location: body.location,
      },
    });
  }

  const fresh = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { patient: true, doctor: true },
  });
  return jsonOk(publicUser(fresh));
}, { auth: true });
