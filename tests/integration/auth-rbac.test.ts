import { beforeAll, describe, expect, it } from "vitest";
import { ACCOUNTS, api, login, patientToken } from "./helpers";

let admin: string, doctor: string, patient: string;
let patientId: string;

beforeAll(async () => {
  const [a, d] = await Promise.all([login(ACCOUNTS.admin), login(ACCOUNTS.doctor)]);
  const p = await login(ACCOUNTS.patient).catch(() => patientToken(a.accessToken));
  admin = a.accessToken;
  doctor = d.accessToken;
  patient = p.accessToken;
  const me = await api<{ patient: { id: string } }>("/api/v1/auth/me", { token: patient });
  patientId = me.json.data.patient.id;
});

describe("login", () => {
  it("rejects a wrong password and an unknown email with the same message", async () => {
    const wrong = await api("/api/v1/auth/login", { method: "POST", json: { email: ACCOUNTS.admin, password: "nope" } });
    const unknown = await api("/api/v1/auth/login", {
      method: "POST",
      json: { email: "nobody@hospital.local", password: "nope" },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.json.error?.message).toBe(unknown.json.error?.message);
  });

  it("returns 400 for malformed JSON and invalid fields", async () => {
    const bad = await api("/api/v1/auth/login", {
      method: "POST",
      body: "{not json",
      headers: { "Content-Type": "application/json" },
    });
    expect(bad.status).toBe(400);
    expect(bad.json.error?.code).toBe("INVALID_JSON");
    const invalid = await api("/api/v1/auth/login", { method: "POST", json: { email: "x", password: "" } });
    expect(invalid.status).toBe(400);
    expect(invalid.json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("never returns the password hash", async () => {
    const r = await api("/api/v1/auth/login", { method: "POST", json: { email: ACCOUNTS.doctor, password: "Password123!" } });
    expect(r.text).not.toContain("passwordHash");
    expect(r.text).not.toMatch(/\$2[aby]\$/);
  });
});

describe("authentication", () => {
  it("requires a token on protected endpoints", async () => {
    for (const path of ["/api/v1/auth/me", "/api/v1/appointments", "/api/v1/notifications", "/api/v1/admin/users"]) {
      const r = await api(path);
      expect(r.status, path).toBe(401);
    }
  });

  it("rejects forged and malformed tokens", async () => {
    const forged =
      "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJlbWFpbCI6ImFAYi5jb20iLCJzdWIiOiJ4In0.c2lnbmF0dXJl";
    expect((await api("/api/v1/admin/users", { token: forged })).status).toBe(401);
    expect((await api("/api/v1/auth/me", { token: "garbage" })).status).toBe(401);
  });

  it("returns the signed-in user for each role", async () => {
    for (const [token, role] of [[admin, "ADMIN"], [doctor, "DOCTOR"], [patient, "PATIENT"]] as const) {
      const r = await api<{ role: string }>("/api/v1/auth/me", { token });
      expect(r.status).toBe(200);
      expect(r.json.data.role).toBe(role);
    }
  });
});

describe("role-based access control", () => {
  const adminOnly = [
    "/api/v1/admin/users",
    "/api/v1/admin/patients",
    "/api/v1/admin/appointments",
    "/api/v1/admin/reports",
    "/api/v1/admin/settings",
    "/api/v1/dashboard/admin",
    "/api/v1/payments",
  ];

  it("blocks patients and doctors from admin endpoints", async () => {
    for (const path of adminOnly) {
      expect((await api(path, { token: patient })).status, `patient ${path}`).toBe(403);
      expect((await api(path, { token: doctor })).status, `doctor ${path}`).toBe(403);
    }
  });

  it("lets admins read admin endpoints", async () => {
    for (const path of adminOnly) {
      expect((await api(path, { token: admin })).status, path).toBe(200);
    }
  });

  it("keeps each role on its own dashboard", async () => {
    expect((await api("/api/v1/dashboard/doctor", { token: patient })).status).toBe(403);
    expect((await api("/api/v1/dashboard/patient", { token: doctor })).status).toBe(403);
    expect((await api("/api/v1/dashboard/doctor", { token: doctor })).status).toBe(200);
    expect((await api("/api/v1/dashboard/patient", { token: patient })).status).toBe(200);
  });

  it("rejects admin writes from non-admins before touching data", async () => {
    const r = await api("/api/v1/doctors", { method: "POST", token: patient, json: {} });
    expect(r.status).toBe(403);
    const d = await api("/api/v1/departments", { method: "POST", token: doctor, json: { name: "Hacked" } });
    expect(d.status).toBe(403);
  });
});

describe("data isolation", () => {
  it("shows a patient only their own appointments", async () => {
    const r = await api<{ patientId: string }[]>("/api/v1/appointments?pageSize=50", { token: patient });
    expect(r.status).toBe(200);
    for (const a of r.json.data) expect(a.patientId).toBe(patientId);
  });

  it("hides other patients' appointments and payments", async () => {
    const all = await api<{ id: string; patientId: string; payments: { id: string }[] }[]>(
      "/api/v1/admin/appointments?pageSize=50",
      { token: admin },
    );
    const other = all.json.data.find((a) => a.patientId !== patientId);
    if (!other) return; // nothing to compare against
    expect((await api(`/api/v1/appointments/${other.id}`, { token: patient })).status).toBe(404);
    const pay = other.payments?.[0];
    if (pay) expect((await api(`/api/v1/payments/${pay.id}`, { token: patient })).status).toBe(403);
    // Ownership is checked before any gateway call or status change.
    const verify = await api("/api/v1/payments/verify", {
      method: "POST",
      token: patient,
      json: { provider: "ESEWA", appointmentId: other.id },
    });
    expect(verify.status).toBe(404);
    const initiate = await api("/api/v1/payments/initiate", {
      method: "POST",
      token: doctor,
      json: { appointmentId: other.id },
    });
    expect(initiate.status).toBe(403);
  });
});

describe("booking validation (no records are created)", () => {
  it("rejects an empty booking", async () => {
    const r = await api("/api/v1/appointments", { method: "POST", token: patient, json: {} });
    expect(r.status).toBe(400);
  });

  it("rejects a slot in the past", async () => {
    const doctors = await api<{ id: string }[]>("/api/v1/doctors?pageSize=1");
    const r = await api("/api/v1/appointments", {
      method: "POST",
      token: patient,
      json: { doctorId: doctors.json.data[0].id, startAt: "2020-01-06T04:15:00.000Z" },
    });
    expect(r.status).toBe(409);
    expect(r.json.error?.code).toBe("SLOT_UNAVAILABLE");
  });

  it("does not let doctors book", async () => {
    const r = await api("/api/v1/appointments", { method: "POST", token: doctor, json: {} });
    expect(r.status).toBe(403);
  });
});

describe("other endpoints", () => {
  it("rejects the reminder cron without its secret", async () => {
    expect((await api("/api/cron/reminders")).status).toBe(401);
    expect((await api("/api/cron/reminders", { headers: { Authorization: "Bearer wrong" } })).status).toBe(401);
  });

  it("rejects an invalid password-reset token", async () => {
    const r = await api("/api/v1/auth/reset-password", {
      method: "POST",
      json: { token: "0000000000000000", password: "NewPassword1" },
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });

  it("blocks path traversal on uploads", async () => {
    for (const p of ["/api/v1/uploads/..%2F.env", "/api/v1/uploads/%2e%2e/%2e%2e/.env", "/api/v1/uploads/../../.env"]) {
      const r = await api(p);
      expect(r.status, p).toBe(404);
      expect(r.text).not.toContain("DATABASE_URL");
    }
  });
});
