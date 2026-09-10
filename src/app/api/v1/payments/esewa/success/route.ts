import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payments/service";

function decodeEsewaData(data: string | null) {
  if (!data) return {};
  try {
    const json = Buffer.from(data, "base64").toString("utf8");
    return JSON.parse(json) as { transaction_uuid?: string; total_amount?: string; status?: string };
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const decoded = decodeEsewaData(url.searchParams.get("data"));
  const transactionUuid =
    decoded.transaction_uuid ?? url.searchParams.get("transaction_uuid") ?? undefined;
  const result = await verifyPayment({
    provider: "ESEWA",
    transactionUuid,
  }).catch((e) => ({ error: String(e) }));
  const app = process.env.APP_URL ?? "http://localhost:3000";
  const ok = "verified" in result && result.verified;
  return NextResponse.redirect(`${app}/payments?esewa=${ok ? "success" : "failed"}`);
}
