"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Bridge page only — no web password form.
 * Email links here (https), then we hand off to Expo / native deep link.
 */
export function OpenResetApp() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [tried, setTried] = useState(false);

  const appHref = useMemo(() => {
    if (!token) return null;
    const encoded = encodeURIComponent(token);
    const template = process.env.NEXT_PUBLIC_PASSWORD_RESET_URL_TEMPLATE?.trim();
    if (template?.includes("{token}")) {
      return template.replaceAll("{token}", encoded);
    }
    // Defaults must match Expo app.json schemes
    const role = params.get("role")?.toLowerCase();
    const scheme =
      role === "doctor"
        ? (process.env.NEXT_PUBLIC_DOCTOR_APP_SCHEME?.trim() || "doctorhospital")
        : (process.env.NEXT_PUBLIC_PATIENT_APP_SCHEME?.trim() || "patienthospital");
    return `${scheme}://reset-password?token=${encoded}`;
  }, [token, params]);

  useEffect(() => {
    if (!appHref) return;
    setTried(true);
    window.location.href = appHref;
  }, [appHref]);

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Missing reset link</h1>
        <p className="text-sm text-muted-foreground">Request a new password reset from the mobile app.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold">Opening the app…</h1>
      <p className="text-sm text-muted-foreground">
        {tried
          ? "If nothing happened, tap the button below. Make sure Expo Go (or the hospital app) is installed."
          : "Handing off to the mobile reset screen."}
      </p>
      {appHref ? (
        <Button asChild className="w-full">
          <a href={appHref}>Open reset screen in app</a>
        </Button>
      ) : null}
    </div>
  );
}
