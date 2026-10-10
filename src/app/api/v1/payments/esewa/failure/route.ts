import { NextResponse } from "next/server";

export async function GET() {
  const app = process.env.APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${app}/portal/payments/result?provider=esewa&status=failed`);
}
