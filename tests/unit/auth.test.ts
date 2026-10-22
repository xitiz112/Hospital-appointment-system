import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { SignJWT } from "jose";
import { ApiError } from "@/lib/errors";
import {
  generateRefreshToken,
  hashToken,
  refreshExpiryDate,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";
import { assertDoctorOwn, assertPatientOwn, scopedAppointmentWhere } from "@/lib/rbac";
import type { CurrentUser } from "@/lib/auth";

const user = (over: Partial<CurrentUser>) => over as CurrentUser;

describe("access tokens", () => {
  it("round-trips subject, role and email", async () => {
    const token = await signAccessToken({ sub: "u1", role: Role.PATIENT, email: "a@b.com" });
    await expect(verifyAccessToken(token)).resolves.toEqual({ sub: "u1", role: "PATIENT", email: "a@b.com" });
  });

  it("rejects a token signed with another secret", async () => {
    const forged = await new SignJWT({ role: "ADMIN", email: "x@y.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("attacker")
      .sign(new TextEncoder().encode("wrong-secret"));
    await expect(verifyAccessToken(forged)).rejects.toMatchObject({ code: "INVALID_TOKEN", status: 401 });
  });

  it("reports expired tokens as SESSION_EXPIRED", async () => {
    const expired = await new SignJWT({ role: "ADMIN", email: "x@y.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));
    await expect(verifyAccessToken(expired)).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("rejects garbage", async () => {
    await expect(verifyAccessToken("not.a.jwt")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("refresh tokens", () => {
  it("stores only a SHA-256 hash of a random token", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toHaveLength(96);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });

  it("expires after the configured number of days", () => {
    process.env.JWT_REFRESH_EXPIRES = "3d";
    const days = (refreshExpiryDate().getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(2.99);
    expect(days).toBeLessThan(3.01);
  });
});

describe("passwords", () => {
  it("hashes with bcrypt and verifies only the right password", async () => {
    const hash = await hashPassword("Correct-Horse-1");
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword("Correct-Horse-1", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });
});

describe("role-based access", () => {
  const admin = user({ role: Role.ADMIN });
  const patient = user({ role: Role.PATIENT, patient: { id: "p1" } as CurrentUser["patient"] });
  const doctor = user({ role: Role.DOCTOR, doctor: { id: "d1" } as CurrentUser["doctor"] });

  it("lets patients see only their own records", () => {
    expect(() => assertPatientOwn(patient, "p1")).not.toThrow();
    expect(() => assertPatientOwn(patient, "p2")).toThrow(ApiError);
    expect(() => assertPatientOwn(doctor, "p1")).toThrow(ApiError);
    expect(() => assertPatientOwn(admin, "p2")).not.toThrow();
  });

  it("lets doctors see only their own records", () => {
    expect(() => assertDoctorOwn(doctor, "d1")).not.toThrow();
    expect(() => assertDoctorOwn(doctor, "d2")).toThrow(ApiError);
    expect(() => assertDoctorOwn(patient, "d1")).toThrow(ApiError);
  });

  it("scopes appointment queries by role", () => {
    expect(scopedAppointmentWhere(admin)).toEqual({});
    expect(scopedAppointmentWhere(doctor)).toEqual({ doctorId: "d1" });
    expect(scopedAppointmentWhere(patient)).toEqual({ patientId: "p1" });
    expect(() => scopedAppointmentWhere(user({ role: Role.PATIENT }))).toThrow(ApiError);
  });
});
