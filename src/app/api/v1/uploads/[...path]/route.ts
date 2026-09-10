import path from "path";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/api";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const relative = parts.join("/");
  const headers = corsHeaders(req);
  if (!relative || relative.includes("..")) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "File not found" }, meta: null },
      { status: 404, headers },
    );
  }
  const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
  const full = path.resolve(/* turbopackIgnore: true */ root, relative);
  if (!full.startsWith(root + path.sep) && full !== root) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "File not found" }, meta: null },
      { status: 404, headers },
    );
  }
  try {
    const data = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    const type =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(data), {
      headers: { ...headers, "Content-Type": type, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "File not found" }, meta: null },
      { status: 404, headers },
    );
  }
}
