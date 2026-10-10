import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payments/service";

export async function GET(req: NextRequest) {
  const pidx = new URL(req.url).searchParams.get("pidx") ?? undefined;
  const result = await verifyPayment({ provider: "KHALTI", pidx }).catch(() => ({ verified: false }));
  const app = process.env.APP_URL ?? "http://localhost:3000";
  const ok = "verified" in result && result.verified;
  const target = new URL("/portal/payments/result", app);
  target.searchParams.set("provider", "khalti");
  target.searchParams.set("status", ok ? "success" : "failed");
  if ("payment" in result) target.searchParams.set("appointmentId", result.payment.appointmentId);
  return NextResponse.redirect(target);
}
