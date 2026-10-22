import { describe, expect, it } from "vitest";
import {
  bookAppointmentSchema,
  initiatePaymentSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  statusSchema,
} from "@/lib/validators";

describe("registerSchema", () => {
  const valid = { name: "Sita Rai", email: "sita@example.com", password: "longenough" };

  it("accepts a minimal valid patient", () => {
    expect(registerSchema.parse(valid)).toMatchObject(valid);
  });

  it("trims the name and rejects short names, bad emails and short passwords", () => {
    expect(registerSchema.parse({ ...valid, name: "  Sita  " }).name).toBe("Sita");
    expect(registerSchema.safeParse({ ...valid, name: " a " }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, gender: "UNKNOWN" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires an email and a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts password or the newPassword alias", () => {
    expect(resetPasswordSchema.parse({ token: "0123456789", password: "abcdefgh" })).toEqual({
      token: "0123456789",
      password: "abcdefgh",
    });
    expect(resetPasswordSchema.parse({ token: "0123456789", newPassword: "abcdefgh" }).password).toBe("abcdefgh");
  });

  it("rejects a missing password", () => {
    expect(resetPasswordSchema.safeParse({ token: "0123456789" }).success).toBe(false);
  });
});

describe("appointment and payment schemas", () => {
  it("needs a doctor and a start time to book", () => {
    expect(bookAppointmentSchema.safeParse({ doctorId: "d1", startAt: "2026-10-21T04:15:00Z" }).success).toBe(true);
    expect(bookAppointmentSchema.safeParse({ doctorId: "", startAt: "x" }).success).toBe(false);
  });

  it("only allows staff-settable statuses", () => {
    expect(statusSchema.safeParse({ status: "COMPLETED" }).success).toBe(true);
    expect(statusSchema.safeParse({ status: "CANCELLED" }).success).toBe(false);
  });

  it("defaults the payment provider to eSewa", () => {
    expect(initiatePaymentSchema.parse({ appointmentId: "a1" }).provider).toBe("ESEWA");
    expect(initiatePaymentSchema.safeParse({ appointmentId: "a1", provider: "PAYPAL" }).success).toBe(false);
  });
});
