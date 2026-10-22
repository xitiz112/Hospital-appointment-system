import { describe, expect, it } from "vitest";
import { dayRangeUtc, localMinutesToUtc, weekdayInZone } from "@/lib/slots";

// Asia/Kathmandu is UTC+05:45 with no DST.
describe("Kathmandu time helpers", () => {
  it("converts local clinic minutes to UTC", () => {
    expect(localMinutesToUtc("2026-10-20", 10 * 60).toISOString()).toBe("2026-10-20T04:15:00.000Z");
    expect(localMinutesToUtc("2026-10-20", 0).toISOString()).toBe("2026-10-19T18:15:00.000Z");
  });

  it("returns the UTC bounds of a local day", () => {
    const { start, end } = dayRangeUtc("2026-10-20");
    expect(start.toISOString()).toBe("2026-10-19T18:15:00.000Z");
    expect(end.toISOString()).toBe("2026-10-20T18:14:59.999Z");
  });

  it("uses the Kathmandu weekday, not the UTC one", () => {
    // 20:00 UTC Monday is already 01:45 Tuesday in Kathmandu.
    expect(weekdayInZone(new Date("2026-10-19T20:00:00Z"))).toBe(2);
    expect(weekdayInZone(new Date("2026-10-19T12:00:00Z"))).toBe(1);
  });
});
