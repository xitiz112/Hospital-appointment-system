import { describe, expect, it } from "vitest";
import { api } from "./helpers";

// Security regression checks. Each test names the weakness it guards against.

describe("security", () => {
  it("does not leak server internals in error responses", async () => {
    const r = await api("/api/v1/doctors?minFee=abc");
    expect(r.status).toBeLessThan(500);
    expect(r.text).not.toMatch(/prisma|\.next\/|invocation|\/Users\/|node_modules/i);
  });

  it("throttles repeated failed logins", async () => {
    // A throwaway address, so no real account gets locked.
    const email = `throttle-${Date.now()}@example.invalid`;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await api("/api/v1/auth/login", {
        method: "POST",
        json: { email, password: `definitely-wrong-${i}` },
      });
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it("requires sign-in to verify a payment", async () => {
    const r = await api("/api/v1/payments/verify", {
      method: "POST",
      json: { provider: "ESEWA", appointmentId: "any" },
    });
    expect(r.status).toBe(401);
  });

  it("sends basic security headers", async () => {
    const r = await api("/portal/login");
    const csp = r.headers.get("content-security-policy") ?? "";
    expect(r.headers.get("x-frame-options") ?? (csp.includes("frame-ancestors") ? "csp" : null)).not.toBeNull();
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("x-powered-by")).toBeNull();
  });

  it("does not pre-fill admin credentials on the staff login page", async () => {
    const r = await api("/login");
    expect(r.text).not.toContain("Password123!");
  });

  it("does not reflect arbitrary origins in CORS", async () => {
    const r = await api("/api/v1/departments", { headers: { Origin: "https://evil.example" } });
    expect(r.headers.get("access-control-allow-origin")).not.toBe("https://evil.example");
  });
});
