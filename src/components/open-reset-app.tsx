"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Bridge page only — no web password form.
 * Email links here (https), then we hand off to Expo / native deep link.
 *
 * Expo Go requires NEXT_PUBLIC_PASSWORD_RESET_URL_TEMPLATE=exp://… because
 * custom schemes (patienthospital://) are not registered in Expo Go.
 */
export function OpenResetApp() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [tried, setTried] = useState(false);
  const [copied, setCopied] = useState(false);

  const appHref = useMemo(() => {
    if (!token) return null;
    const encoded = encodeURIComponent(token);
    const template = process.env.NEXT_PUBLIC_PASSWORD_RESET_URL_TEMPLATE?.trim();
    if (template?.includes("{token}")) {
      return template.replaceAll("{token}", encoded);
    }
    const role = params.get("role")?.toLowerCase();
    const scheme =
      role === "doctor"
        ? (process.env.NEXT_PUBLIC_DOCTOR_APP_SCHEME?.trim() || "doctorhospital")
        : (process.env.NEXT_PUBLIC_PATIENT_APP_SCHEME?.trim() || "patienthospital");
    return `${scheme}://reset-password?token=${encoded}`;
  }, [token, params]);

  const isExpoGoLink = Boolean(appHref?.startsWith("exp://") || appHref?.startsWith("exps://"));
  const isCustomScheme = Boolean(appHref && !isExpoGoLink && !appHref.startsWith("http"));

  useEffect(() => {
    if (!appHref) return;
    setTried(true);
    // Auto-handoff; browsers show “invalid address” if the scheme isn’t installed (e.g. Expo Go + custom scheme).
    window.location.href = appHref;
  }, [appHref]);

  async function copyLink() {
    if (!appHref) return;
    try {
      await navigator.clipboard.writeText(appHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

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
          ? "If nothing happened, tap the button below. Expo Go must already be running this project."
          : "Handing off to the mobile reset screen."}
      </p>

      {isCustomScheme ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-950">
          This button uses <code className="font-mono">{appHref?.split("://")[0]}://</code>, which only works
          in a built Patient/Doctor app. In <strong>Expo Go</strong> it shows “invalid address”. Set{" "}
          <code className="font-mono">NEXT_PUBLIC_PASSWORD_RESET_URL_TEMPLATE</code> to your Metro URL, e.g.{" "}
          <code className="font-mono">exp://192.168.x.x:8081/--/reset-password?token={"{token}"}</code>, then
          redeploy.
        </p>
      ) : null}

      {isExpoGoLink ? (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-left text-xs text-sky-950">
          Using Expo Go deep link. Keep the project open in Expo Go on the same Wi‑Fi, then tap the button.
        </p>
      ) : null}

      {appHref ? (
        <>
          <Button asChild className="w-full">
            <a href={appHref}>Open reset screen in app</a>
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={copyLink}>
            {copied ? "Copied" : "Copy app link"}
          </Button>
          <p className="break-all text-left font-mono text-[11px] text-muted-foreground">{appHref}</p>
        </>
      ) : null}
    </div>
  );
}
