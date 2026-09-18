"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const params = useSearchParams();
  const sessionExpired = params.get("reason") === "session_expired";
  const authRequired = params.get("reason") === "auth_required";
  const [email, setEmail] = useState("admin@hospital.local");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const rawCallback = params.get("callbackUrl") ?? "/dashboard";
    const nextPath = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: nextPath,
    });
    setPending(false);
    if (res?.error || !res?.ok) {
      setError("Invalid admin credentials.");
      return;
    }
    window.location.assign(nextPath);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-10 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8a6a3d]">
          Administrator
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-[#141814]">Sign in</h2>
        <p className="text-sm leading-6 text-[#5c635c]">
          Use your staff account to open the hospital dashboard.
        </p>
      </div>
      {sessionExpired ? (
        <p
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
          role="status"
        >
          Your session has expired. Please sign in again.
        </p>
      ) : authRequired ? (
        <p
          className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950"
          role="status"
        >
          Please sign in to continue.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#2a322c]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-lg border-[#d4cbb8] bg-[#f3eee4] px-3.5 shadow-none focus-visible:ring-[#1f3d32]"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#2a322c]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-lg border-[#d4cbb8] bg-[#f3eee4] px-3.5 pr-11 shadow-none focus-visible:ring-[#1f3d32]"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="clinic-focus absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-[#6a6256] hover:text-[#1a1c19]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error ? (
          <p className="rounded-lg border border-[#e4c4bf] bg-[#f8ecea] px-3 py-2 text-sm text-[#9b3a2f]" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-12 w-full rounded-lg text-sm font-semibold tracking-wide"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Continue to dashboard"}
        </Button>
      </form>
    </div>
  );
}
