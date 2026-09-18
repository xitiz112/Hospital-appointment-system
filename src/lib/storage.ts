import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { del, put } from "@vercel/blob";
import { ApiError } from "@/lib/errors";

export interface StorageAdapter {
  save(buffer: Buffer, filename: string, mime: string, folder?: string): Promise<string>;
  delete(storedPath: string): Promise<void>;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 2 * 1024 * 1024);

function assertImage(buffer: Buffer, mime: string) {
  if (!ALLOWED_TYPES.has(mime)) {
    throw new ApiError("INVALID_FILE_TYPE", "Only JPEG, PNG, and WebP images are allowed", 400);
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new ApiError("FILE_TOO_LARGE", "Image must be 2MB or smaller", 400);
  }
}

function imageExt(mime: string) {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}

function safeFolderName(folder: string) {
  return folder.replace(/[^a-z0-9_-]/gi, "") || "profiles";
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private root = process.env.UPLOAD_DIR ?? "uploads") {}

  async save(buffer: Buffer, _filename: string, mime: string, folder = "profiles") {
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
  async save(buffer: Buffer, _filename: string, mime: string, folder = "profiles") {
    assertImage(buffer, mime);
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError("STORAGE_NOT_CONFIGURED", "BLOB_READ_WRITE_TOKEN is not set", 501);
    }
    const safeFolder = safeFolderName(folder);
    const pathname = `${safeFolder}/${Date.now()}-${randomUUID()}.${imageExt(mime)}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  async delete(storedPath: string) {
    if (!storedPath) return;
    const isBlob =
      storedPath.includes(".blob.vercel-storage.com") ||
      storedPath.startsWith("https://") ||
      storedPath.startsWith("http://");
    if (!isBlob) return;
    try {
      await del(storedPath, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // ignore missing / unauthorized deletes
    }
  }
}

function createStorage(): StorageAdapter {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorageAdapter();
  }
  return new LocalStorageAdapter();
}

export const storage: StorageAdapter = createStorage();

export async function saveImage(file: File, folder: "profiles" | "logos" = "profiles") {
  const bytes = Buffer.from(await file.arrayBuffer());
  return storage.save(bytes, file.name, file.type || "image/jpeg", folder);
}

export async function saveProfileImage(file: File) {
  return saveImage(file, "profiles");
}

export async function saveHospitalLogo(file: File) {
  return saveImage(file, "logos");
}

export async function replaceStoredImage(previousUrl: string | null | undefined, nextUrl: string) {
  if (previousUrl && previousUrl !== nextUrl) {
    await storage.delete(previousUrl);
  }
  return nextUrl;
}

export async function clearStoredImage(url: string | null | undefined) {
  if (url) await storage.delete(url);
}
