import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/api";
import { readPrivateBlob } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const headers = corsHeaders(req);
  const pathname = parts.join("/");
  if (!pathname || pathname.includes("..")) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "File not found" }, meta: null },
      { status: 404, headers },
    );
  }

  try {
    const { stream, contentType } = await readPrivateBlob(pathname);
    return new NextResponse(stream, {
      headers: {
        ...headers,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "File not found" }, meta: null },
      { status: 404, headers },
    );
  }
}
