import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { del, get, put } from "@vercel/blob";
import { ApiError } from "@/lib/errors";

export interface StorageAdapter {
  save(buffer: Buffer, filename: string, mime: string, folder?: string): Promise<string>;
  delete(storedPath: string): Promise<void>;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const BLOB_PROXY_PREFIX = "/api/v1/blob/";

/** Parse env as bytes. Accepts raw bytes ("10485760") or units ("2mb", "10MB"). */
function resolveMaxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_BYTES;

  const unitMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
  if (unitMatch) {
    const n = Number(unitMatch[1]);
    const unit = (unitMatch[2] ?? "b").toLowerCase();
    const mult =
      unit === "gb" ? 1024 ** 3 : unit === "mb" ? 1024 ** 2 : unit === "kb" ? 1024 : 1;
    const bytes = Math.round(n * mult);
    if (Number.isFinite(bytes) && bytes >= 64 * 1024) return bytes;
  }

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 64 * 1024) return asNumber;
  return DEFAULT_MAX_BYTES;
}

const MAX_BYTES = resolveMaxUploadBytes();

export function isUploadFile(value: unknown): value is File {
  if (!value || typeof value !== "object") return false;
  const f = value as Partial<File>;
  return typeof f.arrayBuffer === "function" && typeof f.size === "number" && typeof f.name === "string";
}

function assertImage(buffer: Buffer, mime: string) {
  if (!ALLOWED_TYPES.has(mime)) {
    throw new ApiError("INVALID_FILE_TYPE", "Only JPEG, PNG, and WebP images are allowed", 400);
  }
  if (buffer.byteLength > MAX_BYTES) {
    const sizeKb = Math.round(buffer.byteLength / 1024);
    const maxMb = Math.round((MAX_BYTES / (1024 * 1024)) * 10) / 10;
    throw new ApiError(
      "FILE_TOO_LARGE",
      `Image is ${sizeKb}KB; maximum allowed is ${maxMb}MB`,
      400,
    );
  }
}

function imageExt(mime: string) {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}

function safeFolderName(folder: string) {
  return folder.replace(/[^a-z0-9_-]/gi, "") || "profiles";
}

function blobAccessOrder(): Array<"public" | "private"> {
  const forced = process.env.BLOB_ACCESS?.trim().toLowerCase();
  if (forced === "public") return ["public", "private"];
  if (forced === "private") return ["private", "public"];
  // New Vercel Blob stores default to Private; try private first.
  return ["private", "public"];
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private root = process.env.UPLOAD_DIR ?? "uploads") {}

  async save(buffer: Buffer, _filename: string, mime: string, folder = "profiles") {
    if (process.env.VERCEL) {
      throw new ApiError(
        "STORAGE_NOT_CONFIGURED",
        "BLOB_READ_WRITE_TOKEN is missing on Vercel. Connect a Blob store to this project (Storage tab) so the token is added, then redeploy.",
        501,
      );
    }
    assertImage(buffer, mime);
    const safeFolder = safeFolderName(folder);
    const safe = `${Date.now()}-${randomUUID()}.${imageExt(mime)}`;
    const dir = path.join(/* turbopackIgnore: true */ process.cwd(), this.root, safeFolder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safe), buffer);
    return `/api/v1/uploads/${safeFolder}/${safe}`;
  }

  async delete(storedPath: string) {
    if (!storedPath?.startsWith("/api/v1/uploads/")) return;
    const relative = storedPath.replace(/^\/api\/v1\/uploads\//, "");
    const full = path.resolve(/* turbopackIgnore: true */ process.cwd(), this.root, relative);
    const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), this.root);
    if (!full.startsWith(root + path.sep) && full !== root) return;
    try {
      await unlink(full);
    } catch {
      // ignore missing files
    }
  }
}

/** Used on Vercel when BLOB_READ_WRITE_TOKEN is set. */
export class VercelBlobStorageAdapter implements StorageAdapter {
  private async putOnce(
    buffer: Buffer,
    mime: string,
    folder: string,
    access: "public" | "private",
  ) {
    const safeFolder = safeFolderName(folder);
    const pathname = `${safeFolder}/${Date.now()}-${randomUUID()}.${imageExt(mime)}`;
    const blob = await put(pathname, buffer, {
      access,
      contentType: mime,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    // Private blobs are not anonymous-readable; serve through our proxy.
    if (access === "private") {
      return `${BLOB_PROXY_PREFIX}${pathname}`;
    }
    return blob.url;
  }

  async save(buffer: Buffer, _filename: string, mime: string, folder = "profiles") {
    assertImage(buffer, mime);
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError("STORAGE_NOT_CONFIGURED", "BLOB_READ_WRITE_TOKEN is not set", 501);
    }

    // SDK often hides "private store" as a generic service error — try both modes.
    const errors: string[] = [];
    for (const access of blobAccessOrder()) {
      try {
        return await this.putOnce(buffer, mime, folder, access);
      } catch (error) {
        const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        errors.push(`${access} → ${msg}`);
      }
    }
    throw new ApiError(
      "STORAGE_ERROR",
      `Blob upload failed for both access modes. ${errors.join(" | ")}`,
      502,
    );
  }

  async delete(storedPath: string) {
    if (!storedPath) return;
    try {
      if (storedPath.startsWith(BLOB_PROXY_PREFIX)) {
        const pathname = storedPath.slice(BLOB_PROXY_PREFIX.length);
        if (pathname) await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
        return;
      }
      const isBlobUrl =
        storedPath.includes(".blob.vercel-storage.com") ||
        storedPath.startsWith("https://") ||
        storedPath.startsWith("http://");
      if (!isBlobUrl) return;
      await del(storedPath, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // ignore missing / unauthorized deletes
    }
  }
}

/** Stream a private blob through the app (for img tags). */
export async function readPrivateBlob(pathname: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const result =
    (await get(pathname, { access: "private", token }).catch(() => null)) ??
    (await get(pathname, { access: "public", token }).catch(() => null));

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new ApiError("NOT_FOUND", "File not found", 404);
  }
  return {
    stream: result.stream,
    contentType: result.blob.contentType ?? "application/octet-stream",
  };
}

function getStorage(): StorageAdapter {
  // Resolve at request time so Vercel runtime env (BLOB_READ_WRITE_TOKEN) is visible.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorageAdapter();
  }
  return new LocalStorageAdapter();
}

export async function saveImage(file: File, folder: "profiles" | "logos" = "profiles") {
  const mime = file.type || "image/jpeg";
  if (!ALLOWED_TYPES.has(mime)) {
    throw new ApiError("INVALID_FILE_TYPE", "Only JPEG, PNG, and WebP images are allowed", 400);
  }
  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    const sizeKb = Math.round(file.size / 1024);
    const maxMb = Math.round((MAX_BYTES / (1024 * 1024)) * 10) / 10;
    throw new ApiError(
      "FILE_TOO_LARGE",
      `Image is ${sizeKb}KB; maximum allowed is ${maxMb}MB`,
      400,
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return getStorage().save(bytes, file.name, mime, folder);
}

export async function saveProfileImage(file: File) {
  return saveImage(file, "profiles");
}

export async function saveHospitalLogo(file: File) {
  return saveImage(file, "logos");
}

export async function replaceStoredImage(previousUrl: string | null | undefined, nextUrl: string) {
  if (previousUrl && previousUrl !== nextUrl) {
    await getStorage().delete(previousUrl);
  }
  return nextUrl;
}

export async function clearStoredImage(url: string | null | undefined) {
  if (url) await getStorage().delete(url);
}
