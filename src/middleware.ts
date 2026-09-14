import { NextRequest, NextResponse } from "next/server";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const value =
    allowed.length === 0 || allowed.includes("*")
      ? origin || "*"
      : allowed.includes(origin)
        ? origin
        : allowed[0];

  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function middleware(req: NextRequest) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const res = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
