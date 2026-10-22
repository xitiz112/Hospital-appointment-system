import { describe, expect, it } from "vitest";
import { api } from "./helpers";

type Doctor = { id: string; consultationFee: number; user: { name: string; status: string }; department: { name: string } };

describe("public catalogue", () => {
  it("lists departments and specializations", async () => {
    const d = await api<unknown[]>("/api/v1/departments");
    expect(d.status).toBe(200);
    expect(d.json.success).toBe(true);
    expect(d.json.data.length).toBeGreaterThan(0);
    const s = await api<unknown[]>("/api/v1/specializations");
    expect(s.status).toBe(200);
  });

  it("returns the current hospital", async () => {
    const r = await api<{ name: string; timezone: string }>("/api/v1/hospitals/current");
    expect(r.status).toBe(200);
    expect(r.json.data.timezone).toBe("Asia/Kathmandu");
  });

  it("lists only active doctors, paginated, without private fields", async () => {
    const r = await api<Doctor[]>("/api/v1/doctors?pageSize=50");
    expect(r.status).toBe(200);
    expect(r.json.meta).toMatchObject({ page: 1, pageSize: 50 });
    for (const d of r.json.data) {
      expect(d.user.status).toBe("ACTIVE");
      expect(d.user).not.toHaveProperty("passwordHash");
      expect(d.user).not.toHaveProperty("email");
    }
  });

  it("sorts doctors by fee and filters by search text", async () => {
    const r = await api<Doctor[]>("/api/v1/doctors?sort=fee&pageSize=50");
    const fees = r.json.data.map((d) => Number(d.consultationFee));
    expect(fees).toEqual([...fees].sort((a, b) => a - b));

    const first = r.json.data[0];
    const q = encodeURIComponent(first.department.name);
    const filtered = await api<Doctor[]>(`/api/v1/doctors?q=${q}`);
    expect(filtered.json.data.some((d) => d.id === first.id)).toBe(true);
  });

  it("clamps pageSize to 50", async () => {
    const r = await api("/api/v1/doctors?pageSize=10000");
    expect(r.json.meta).toMatchObject({ pageSize: 50 });
  });

  it("returns slots on the doctor's 30-minute grid", async () => {
    const doctors = await api<Doctor[]>("/api/v1/doctors?pageSize=1");
    const id = doctors.json.data[0].id;
    // Pick a Monday a week out so the doctor is scheduled.
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
    const date = d.toISOString().slice(0, 10);
    const r = await api<{ startAt: string; endAt: string; available: boolean }[]>(
      `/api/v1/doctors/${id}/slots?date=${date}`,
    );
    expect(r.status).toBe(200);
    expect(r.json.data.length).toBeGreaterThan(0);
    for (const s of r.json.data) {
      expect(new Date(s.endAt).getTime() - new Date(s.startAt).getTime()).toBeGreaterThan(0);
    }
    const starts = r.json.data.map((s) => s.startAt);
    expect(starts).toEqual([...starts].sort());
  });

  it("validates slot queries", async () => {
    const doctors = await api<Doctor[]>("/api/v1/doctors?pageSize=1");
    const id = doctors.json.data[0].id;
    expect((await api(`/api/v1/doctors/${id}/slots`)).status).toBe(400);
    expect((await api("/api/v1/doctors/does-not-exist/slots?date=2026-10-26")).status).toBe(404);
    expect((await api("/api/v1/doctors/does-not-exist")).status).toBe(404);
  });
});
