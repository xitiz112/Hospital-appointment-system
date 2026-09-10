import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  email: string;
};

function accessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES ?? "15m")
    .sign(accessSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, accessSecret());
  if (!payload.sub || typeof payload.role !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid token payload");
  }
  return {
    sub: payload.sub,
    role: payload.role as Role,
    email: payload.email,
  };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken() {
  const token = randomBytes(48).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function generateResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function refreshExpiryDate() {
  const spec = process.env.JWT_REFRESH_EXPIRES ?? "7d";
  const days = spec.endsWith("d") ? Number(spec.slice(0, -1)) : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
