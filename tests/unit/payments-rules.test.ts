import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { PaymentStatus, Prisma } from "@prisma/client";
import { hasSuccessfulPayment, requiresSuccessfulPayment } from "@/lib/appointments";
import { signEsewa } from "@/lib/payments/esewa";

describe("payment rules", () => {
  it("requires payment only when the hospital demands it and the fee is positive", () => {
    expect(requiresSuccessfulPayment(true, new Prisma.Decimal(500))).toBe(true);
    expect(requiresSuccessfulPayment(true, "0")).toBe(false);
    expect(requiresSuccessfulPayment(false, 500)).toBe(false);
  });

  it("detects a successful payment among others", () => {
    expect(hasSuccessfulPayment([{ status: PaymentStatus.FAILED }, { status: PaymentStatus.SUCCESS }])).toBe(true);
    expect(hasSuccessfulPayment([{ status: PaymentStatus.PENDING }])).toBe(false);
    expect(hasSuccessfulPayment([])).toBe(false);
  });
});

describe("signEsewa", () => {
  it("signs total_amount, transaction_uuid and product_code with HMAC-SHA256", () => {
    process.env.ESEWA_PRODUCT_CODE = "EPAYTEST";
    process.env.ESEWA_SECRET_KEY = "unit-test-key";
    const signed = signEsewa("1500.00", "txn-123");
    const expected = createHmac("sha256", "unit-test-key")
      .update("total_amount=1500.00,transaction_uuid=txn-123,product_code=EPAYTEST")
      .digest("base64");
    expect(signed).toEqual({
      product_code: "EPAYTEST",
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: expected,
    });
  });
});
