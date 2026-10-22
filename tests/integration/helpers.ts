import { SignJWT } from "jose";

export const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const PASSWORD = process.env.TEST_PASSWORD ?? "Password123!";

export const ACCOUNTS = {
  admin: "admin@hospital.local",
  doctor: "doctor@hospital.local",
  patient: "patient@hospital.local",
} as const;

export type Envelope<T = unknown> = {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
  meta: unknown;
};

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { token?: string; json?: unknown } = {},
) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, body, redirect: "manual" });
  const text = await res.text();
  let json: Envelope<T> | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON (images, HTML)
  }
  return { status: res.status, headers: res.headers, json: json as Envelope<T>, text };
}

export async function login(email: string) {
  const r = await api<{ accessToken: string; user: { id: string; role: string } }>("/api/v1/auth/login", {
    method: "POST",
    json: { email, password: PASSWORD },
  });
  if (r.status !== 200) throw new Error(`login ${email} failed: ${r.status} ${r.text}`);
  return r.json.data;
}

/**
 * Access token for an active patient, signed with JWT_ACCESS_SECRET.
 * Used when the seeded patient's password has been changed. Finds the patient
 * through the admin API, so it needs no database connection and writes nothing.
 */
export async function patientToken(adminToken: string) {
  const r = await api<{ user: { id: string; email: string; status: string } }[]>("/api/v1/admin/patients", {
    token: adminToken,
  });
  const active = r.json.data.filter((p) => p.user.status === "ACTIVE");
  const user = (active.find((p) => p.user.email === ACCOUNTS.patient) ?? active[0])?.user;
  if (!user) throw new Error("no active patient");
  const accessToken = await new SignJWT({ role: "PATIENT", email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));
  return { accessToken, user: { id: user.id, role: "PATIENT" } };
}
