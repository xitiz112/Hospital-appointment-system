"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const appLinks = useMemo(() => {
    if (!token) return [];
    const encoded = encodeURIComponent(token);
    return [
      { label: "Open in Patient app", href: `patienthospital://reset-password?token=${encoded}` },
      { label: "Open in Doctor app", href: `doctorhospital://reset-password?token=${encoded}` },
    ];
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token. Open the link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json();
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Could not reset password");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1200);
  }

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Reset link required</h1>
        <p className="text-sm text-muted-foreground">
          Open the password reset link from your email, or request a new one from the app.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md space-y-3 rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Password updated</h1>
        <p className="text-sm text-muted-foreground">You can sign in with your new password.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">This link expires one hour after it was sent.</p>
      </div>

      <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Prefer the mobile app?</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {appLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm hover:bg-accent"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
