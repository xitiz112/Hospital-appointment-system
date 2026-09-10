import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_PREFIXES = [
  "/dashboard",
  "/departments",
  "/doctors",
  "/patients",
  "/appointments",
  "/payments",
  "/reports",
  "/settings",
  "/schedules",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminPath = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isAdminPath) {
    const role = req.auth?.user?.role;
    if (!req.auth || role !== "ADMIN") {
      const login = new URL("/login", req.nextUrl.origin);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/departments/:path*",
    "/doctors/:path*",
    "/patients/:path*",
    "/appointments/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/schedules/:path*",
  ],
};
