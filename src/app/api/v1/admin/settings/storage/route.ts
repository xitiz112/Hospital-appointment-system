import { Role } from "@prisma/client";
import { apiHandler, jsonOk } from "@/lib/api";

/** Admin-only: confirms whether Blob env is visible on this deployment. */
export const GET = apiHandler(async () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  return jsonOk({
    onVercel: Boolean(process.env.VERCEL),
    blobTokenPresent: Boolean(token),
    blobTokenPrefix: token ? `${token.slice(0, 12)}…` : null,
    blobAccess: process.env.BLOB_ACCESS ?? "(auto: private then public)",
    maxUploadBytes: process.env.MAX_UPLOAD_BYTES ?? "(default 10mb)",
  });
}, { auth: true, roles: [Role.ADMIN] });
