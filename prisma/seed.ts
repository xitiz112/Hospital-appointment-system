import { Prisma } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

const PASSWORD = "Password123!";

const DEPARTMENTS = [
  {
    name: "Cardiology",
    description: "Heart and cardiovascular care",
    specialization: "Cardiology",
    doctor: {
      name: "Dr. Anisha Sharma",
      email: "anisha.sharma@hospital.local",
      phone: "9800000001",
      qualifications: "MD, DM Cardiology",
      experienceYears: 12,
      consultationFee: 1500,
      location: "OPD Block A, Room 12",
      bio: "Consultant cardiologist focusing on hypertension and preventive heart care.",
    },
  },
  {
    name: "Dermatology",
    description: "Skin, hair, and nail care",
    specialization: "Dermatology",
    doctor: {
      name: "Dr. Bikash Thapa",
      email: "bikash.thapa@hospital.local",
      phone: "9800000002",
      qualifications: "MD Dermatology",
      experienceYears: 8,
      consultationFee: 1200,
      location: "OPD Block B, Room 4",
      bio: "Dermatologist with interest in acne, eczema, and cosmetic dermatology.",
    },
  },
  {
    name: "Orthopedics",
    description: "Bones, joints, and sports injuries",
    specialization: "Orthopedics",
    doctor: {
      name: "Dr. Niraj Gurung",
      email: "niraj.gurung@hospital.local",
      phone: "9800000003",
      qualifications: "MS Orthopedics",
      experienceYears: 10,
      consultationFee: 1400,
      location: "OPD Block C, Room 8",
      bio: "Orthopedic surgeon treating fractures, arthritis, and sports injuries.",
    },
  },
  {
    name: "Pediatrics",
    description: "Child and adolescent health",
    specialization: "Pediatrics",
    doctor: {
      name: "Dr. Sita Adhikari",
      email: "sita.adhikari@hospital.local",
      phone: "9800000004",
      qualifications: "MD Pediatrics",
      experienceYears: 9,
      consultationFee: 1000,
      location: "OPD Block D, Room 2",
      bio: "Pediatrician providing well-child visits and acute pediatric care.",
    },
  },
  {
    name: "Gynecology",
    description: "Women's health and maternity",
    specialization: "Gynecology",
    doctor: {
      name: "Dr. Maya Rai",
      email: "maya.rai@hospital.local",
      phone: "9800000005",
      qualifications: "MD Obstetrics & Gynecology",
      experienceYears: 11,
      consultationFee: 1300,
      location: "OPD Block E, Room 6",
      bio: "OB-GYN focused on reproductive health and prenatal care.",
    },
  },
  {
    name: "General Medicine",
    description: "Primary care and internal medicine",
    specialization: "General Practice",
    doctor: {
      name: "Dr. Hari Basnet",
      email: "doctor@hospital.local",
      phone: "9800000006",
      qualifications: "MD Internal Medicine",
      experienceYears: 14,
      consultationFee: 800,
      location: "OPD Block A, Room 1",
      bio: "General physician for adult primary care and chronic disease follow-up.",
    },
  },
] as const;

/** Nepal working week: Sunday–Friday. Saturday is the weekend. JS getDay(): 0=Sun … 6=Sat */
const WORKING_WEEKDAYS = [0, 1, 2, 3, 4, 5];

async function main() {
  console.log("Seeding hospital appointment system…");
  const passwordHash = await hashPassword(PASSWORD);

  await prisma.payment.deleteMany();
  await prisma.appointmentReschedule.deleteMany();
  await prisma.appointmentCancellation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.scheduleBreak.deleteMany();
  await prisma.doctorUnavailability.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.hospital.deleteMany();

  const hospital = await prisma.hospital.create({
    data: {
      name: "Kathmandu General Hospital",
      email: "info@hospital.local",
      phone: "01-4000000",
      address: "Bagbazar, Kathmandu, Nepal",
      timezone: "Asia/Kathmandu",
      cancellationHours: 24,
      paymentRequired: true,
      defaultAppointmentDurationMin: 30,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@hospital.local",
      phone: "9800000000",
      passwordHash,
      name: "Hospital Admin",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      email: "patient@hospital.local",
      phone: "9811111111",
      passwordHash,
      name: "Demo Patient",
      role: "PATIENT",
      status: "ACTIVE",
      patient: {
        create: {
          dateOfBirth: new Date("1994-05-12T00:00:00.000Z"),
          gender: "FEMALE",
          address: "Lalitpur, Nepal",
          notifyEmail: true,
          notifyPush: true,
        },
      },
    },
  });

  for (const dept of DEPARTMENTS) {
    const department = await prisma.department.create({
      data: {
        hospitalId: hospital.id,
        name: dept.name,
        description: dept.description,
        isActive: true,
      },
    });

    const specialization = await prisma.specialization.create({
      data: {
        name: dept.specialization,
        departmentId: department.id,
      },
    });

    const doctorUser = await prisma.user.create({
      data: {
        email: dept.doctor.email,
        phone: dept.doctor.phone,
        passwordHash,
        name: dept.doctor.name,
        role: "DOCTOR",
        status: "ACTIVE",
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        hospitalId: hospital.id,
        departmentId: department.id,
        specializationId: specialization.id,
        qualifications: dept.doctor.qualifications,
        experienceYears: dept.doctor.experienceYears,
        consultationFee: new Prisma.Decimal(dept.doctor.consultationFee),
        appointmentDurationMin: 30,
        location: dept.doctor.location,
        isAvailable: true,
        bio: dept.doctor.bio,
      },
    });

    for (const weekday of WORKING_WEEKDAYS) {
      await prisma.doctorSchedule.createMany({
        data: [
          { doctorId: doctor.id, weekday, startMin: 9 * 60, endMin: 13 * 60 },
          { doctorId: doctor.id, weekday, startMin: 14 * 60, endMin: 17 * 60 },
        ],
      });
      await prisma.scheduleBreak.create({
        data: {
          doctorId: doctor.id,
          weekday,
          startMin: 13 * 60,
          endMin: 14 * 60,
          label: "Lunch",
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("  Admin:   admin@hospital.local / Password123!");
  console.log("  Doctor:  doctor@hospital.local / Password123!");
  console.log("  Patient: patient@hospital.local / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
