import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ApiError } from "@/lib/errors";

export interface StorageAdapter {
  save(buffer: Buffer, filename: string, mime: string): Promise<string>;
  delete(storedPath: string): Promise<void>;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 2 * 1024 * 1024);

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private root = process.env.UPLOAD_DIR ?? "uploads") {}

  async save(buffer: Buffer, _filename: string, mime: string) {
    if (!ALLOWED_TYPES.has(mime)) {
      throw new ApiError("INVALID_FILE_TYPE", "Only JPEG, PNG, and WebP images are allowed", 400);
    }
    if (buffer.byteLength > MAX_BYTES) {
      throw new ApiError("FILE_TOO_LARGE", "Image must be 2MB or smaller", 400);
    }
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const safe = `${Date.now()}-${randomUUID()}.${ext}`;
    const dir = path.join(/* turbopackIgnore: true */ process.cwd(), this.root, "profiles");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safe), buffer);
    return `/api/v1/uploads/profiles/${safe}`;
  }

  async delete(storedPath: string) {
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

/** Same interface as local disk — swap this in when S3 credentials are available. */
export class S3StorageAdapter implements StorageAdapter {
  async save(): Promise<string> {
    throw new ApiError("STORAGE_NOT_CONFIGURED", "S3 storage is not configured", 501);
  }
  async delete(): Promise<void> {
    throw new ApiError("STORAGE_NOT_CONFIGURED", "S3 storage is not configured", 501);
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();

export async function saveProfileImage(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return storage.save(bytes, file.name, file.type || "image/jpeg");
}
