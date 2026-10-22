import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { hhmmToMinutes, minutesToHHmm, toJsonValue } from "@/lib/serialize";

describe("minutesToHHmm / hhmmToMinutes", () => {
  it("formats minutes as zero-padded HH:mm", () => {
    expect(minutesToHHmm(0)).toBe("00:00");
    expect(minutesToHHmm(9 * 60 + 5)).toBe("09:05");
    expect(minutesToHHmm(23 * 60 + 59)).toBe("23:59");
  });

  it("round-trips every quarter hour of the day", () => {
    for (let m = 0; m < 24 * 60; m += 15) {
      expect(hhmmToMinutes(minutesToHHmm(m))).toBe(m);
    }
  });
});

describe("toJsonValue", () => {
  it("converts Decimal, Date and bigint deeply", () => {
    const out = toJsonValue({
      fee: new Prisma.Decimal("1500.50"),
      at: new Date("2026-10-20T04:15:00.000Z"),
      big: BigInt(42),
      nested: [{ amount: new Prisma.Decimal(10) }],
      none: null,
    });
    expect(out).toEqual({
      fee: 1500.5,
      at: "2026-10-20T04:15:00.000Z",
      big: "42",
      nested: [{ amount: 10 }],
      none: null,
    });
  });
});
