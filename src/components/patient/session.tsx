"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, readSession, writeSession, PatientApiError, type PatientUser } from "@/lib/patient-client";
import type { Hospital } from "@/lib/patient-types";

type AuthPayload = { user: PatientUser; accessToken: string; refreshToken: string };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  address?: string;
};

type SessionState = {
  user: PatientUser | null;
  hospital: Hospital | null;
  status: "loading" | "authenticated" | "anonymous";
  expired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: PatientUser) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function PatientSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PatientUser | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    api<Hospital>("/api/v1/hospitals/current", { auth: false })
      .then((r) => setHospital(r.data))
      .catch(() => setHospital(null));

    const restore = readSession()
      ? api<PatientUser>("/api/v1/auth/me").then((r) => r.data)
      : Promise.resolve(null);
    restore
      .then((me) => {
        if (!me || me.role !== "PATIENT") {
          if (me) writeSession(null);
          setStatus("anonymous");
          return;
        }
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        writeSession(null);
        setStatus("anonymous");
      });
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setExpired(true);
      setStatus("anonymous");
    };
    window.addEventListener("patient-session-expired", onExpired);
    return () => window.removeEventListener("patient-session-expired", onExpired);
  }, []);

  const accept = useCallback((payload: AuthPayload) => {
    writeSession({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
    setUser(payload.user);
    setExpired(false);
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api<AuthPayload>("/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      if (data.user.role !== "PATIENT") {
        // Staff tokens are valid API-wide; don't keep them in the patient portal.
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.accessToken}` },
          body: JSON.stringify({ refreshToken: data.refreshToken }),
        }).catch(() => null);
        throw new PatientApiError(
          "NOT_A_PATIENT",
          data.user.role === "ADMIN"
            ? "This is the patient portal. Staff should sign in at the admin dashboard."
            : "This is the patient portal. Doctors should use the doctor app.",
          403,
        );
      }
      accept(data);
    },
    [accept],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { data } = await api<AuthPayload>("/api/v1/auth/register", {
        method: "POST",
        body: input,
        auth: false,
      });
      accept(data);
    },
    [accept],
  );

  const logout = useCallback(async () => {
    const session = readSession();
    if (session) {
      await api("/api/v1/auth/logout", {
        method: "POST",
        body: { refreshToken: session.refreshToken },
      }).catch(() => null);
    }
    writeSession(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({ user, hospital, status, expired, login, register, logout, setUser }),
    [user, hospital, status, expired, login, register, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function usePatientSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("usePatientSession must be used inside PatientSessionProvider");
  return ctx;
}
