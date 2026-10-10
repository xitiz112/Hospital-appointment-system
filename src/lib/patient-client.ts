"use client";

/**
 * Browser client for the patient portal. Talks to /api/v1 with the same
 * Bearer access/refresh tokens the mobile app uses (no Auth.js cookie).
 */

const STORAGE_KEY = "has.patient.session";

export type Gender = "MALE" | "FEMALE" | "OTHER";

export type PatientUser = {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
  imageUrl: string | null;
  patient: {
    id: string;
    dateOfBirth: string | null;
    gender: Gender | null;
    address: string | null;
    notifyEmail: boolean;
    notifyPush: boolean;
    notifySms: boolean;
  } | null;
};

type StoredSession = { accessToken: string; refreshToken: string };

type Envelope<T> = {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
  meta: Record<string, unknown> | null;
};

export class PatientApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "PatientApiError";
  }
}

export function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): the session lives only for this page view.
  }
}

const AUTH_FAILURES = new Set(["SESSION_EXPIRED", "INVALID_TOKEN", "UNAUTHORIZED"]);

let refreshing: Promise<boolean> | null = null;

/** Rotates the refresh token once, shared across concurrent 401s. */
function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const current = readSession();
      if (!current) return false;
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      const json = (await res.json().catch(() => null)) as Envelope<StoredSession> | null;
      if (!json?.success) {
        writeSession(null);
        return false;
      }
      writeSession({ accessToken: json.data.accessToken, refreshToken: json.data.refreshToken });
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Send the Bearer token (default true). */
  auth?: boolean;
};

export type ApiResult<T> = { data: T; meta: Record<string, unknown> | null };

export async function api<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, auth = true } = options;

  const send = () => {
    const headers: Record<string, string> = {};
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    const session = auth ? readSession() : null;
    if (session) headers.Authorization = `Bearer ${session.accessToken}`;
    return fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      cache: "no-store",
    });
  };

  let res = await send();
  let json = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (auth && res.status === 401 && AUTH_FAILURES.has(json?.error?.code ?? "")) {
    if (await refreshSession()) {
      res = await send();
      json = (await res.json().catch(() => null)) as Envelope<T> | null;
    } else {
      window.dispatchEvent(new Event("patient-session-expired"));
    }
  }

  if (!json) throw new PatientApiError("NETWORK", "Could not reach the server. Try again.", res.status);
  if (!json.success) {
    throw new PatientApiError(
      json.error?.code ?? "ERROR",
      json.error?.message ?? "Something went wrong",
      res.status,
    );
  }
  return { data: json.data, meta: json.meta };
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
