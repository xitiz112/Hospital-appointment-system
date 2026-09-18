import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role, UserStatus } from "@prisma/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { toJsonValue } from "@/lib/serialize";
import { ApiError } from "@/lib/errors";

export { ApiError } from "@/lib/errors";

export function corsHeaders(req: Request) {
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
  };
}

export function jsonOk(data: unknown = null, meta?: unknown, status = 200) {
  return NextResponse.json(
    { success: true, data: toJsonValue(data), error: null, meta: meta ?? null },
    { status },
  );
}

export function jsonError(code: string, message: string, status = 400, meta?: unknown) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code, message },
      meta: meta ?? null,
    },
    { status },
  );
}

function withCors(res: NextResponse, req: Request) {
  const headers = corsHeaders(req);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

type HandlerOptions = {
  auth?: boolean;
  roles?: Role[];
};

type HandlerCtx<P> = {
  req: NextRequest;
  user: CurrentUser | null;
  params: P;
};

export function apiHandler<P extends Record<string, string> = Record<string, string>>(
  handler: (ctx: HandlerCtx<P>) => Promise<NextResponse>,
  options: HandlerOptions = {},
) {
  return async (req: NextRequest, route?: { params?: Promise<P> }) => {
    if (req.method === "OPTIONS") {
      return withCors(new NextResponse(null, { status: 204 }), req);
    }
    try {
      const params = (route?.params ? await route.params : {}) as P;
      let user: CurrentUser | null = null;
      if (options.auth || options.roles?.length) {
        user = await getCurrentUser(req);
        if (!user) {
          return withCors(
            jsonError("UNAUTHORIZED", "Authentication required. Please sign in again.", 401),
            req,
          );
        }
        if (user.status !== UserStatus.ACTIVE) {
          return withCors(jsonError("ACCOUNT_INACTIVE", "Account is inactive", 403), req);
        }
        if (options.roles?.length && !options.roles.includes(user.role)) {
          return withCors(jsonError("FORBIDDEN", "You do not have access to this resource", 403), req);
        }
      } else {
        user = await getCurrentUser(req).catch(() => null);
      }
      const res = await handler({ req, user, params });
      return withCors(res, req);
    } catch (error) {
      if (error instanceof ApiError) {
        return withCors(jsonError(error.code, error.message, error.status), req);
      }
      if (error instanceof ZodError) {
        const message = error.issues.map((i) => i.message).join("; ") || "Invalid input";
        return withCors(jsonError("VALIDATION_ERROR", message, 400, error.issues), req);
      }
      console.error(error);
      return withCors(jsonError("INTERNAL_ERROR", "Something went wrong", 500), req);
    }
  };
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }
}
