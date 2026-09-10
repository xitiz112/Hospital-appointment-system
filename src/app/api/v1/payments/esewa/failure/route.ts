import { NextResponse } from "next/server";

export async function GET() {
  const app = process.env.APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${app}/payments?esewa=failed`);
}
