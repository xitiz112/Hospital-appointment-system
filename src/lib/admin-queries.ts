import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Minimal user fields for admin tables (never pull passwordHash). */
export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  imageUrl: true,
  role: true,
  createdAt: true,
} as const;

/** Doctor/patient option lists for filters and book forms. */
export async function adminDoctorOptions(opts?: { availableOnly?: boolean }) {
  return prisma.doctor.findMany({
    where: {
      user: { status: "ACTIVE" },
      ...(opts?.availableOnly ? { isAvailable: true } : {}),
    },
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } } },
  });
}

export async function adminPatientOptions() {
  return prisma.patient.findMany({
    where: { user: { status: "ACTIVE" } },
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } } },
  });
}

/** Hospital settings change rarely — cache briefly to cut round-trips. */
export const getHospitalCached = unstable_cache(
  async () =>
    prisma.hospital.findFirst({
      select: {
        id: true,
        name: true,
        paymentRequired: true,
        timezone: true,
        cancellationHours: true,
        defaultAppointmentDurationMin: true,
        logoUrl: true,
      },
    }),
  ["admin-hospital"],
  { revalidate: 60 },
);
