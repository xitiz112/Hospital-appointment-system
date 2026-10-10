"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/patient-client";
import { usePatientSession, type RegisterInput } from "@/components/patient/session";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 rounded-lg border-[#d4cbb8] bg-[#f3eee4] px-3.5 shadow-none focus-visible:ring-[#1f3d32]";

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/portal") && !raw.startsWith("//") ? raw : "/portal";
}

function Heading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mb-8 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8a6a3d]">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-[#141814]">{title}</h2>
      <p className="text-sm leading-6 text-[#5c635c]">{copy}</p>
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "info" | "success"; children: React.ReactNode }) {
  const styles = {
    error: "border-[#e4c4bf] bg-[#f8ecea] text-[#9b3a2f]",
    info: "border-amber-200 bg-amber-50 text-amber-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];
  return (
    <p className={cn("rounded-lg border px-3 py-2.5 text-sm", styles)} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[#2a322c]">
        {label}
        {hint ? <span className="ml-1 font-normal text-[#8a8275]">{hint}</span> : null}
      </Label>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldClass, "pr-11")}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="clinic-focus absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-[#6a6256] hover:text-[#1a1c19]"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Sends signed-in patients straight to where they were going. */
function useRedirectWhenSignedIn(target: string) {
  const { status } = usePatientSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace(target);
  }, [status, router, target]);
}

export function PatientLoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const reason = params.get("reason");
  const { login, expired } = usePatientSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useRedirectWhenSignedIn(next);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Heading eyebrow="Patient" title="Sign in" copy="Welcome back. Sign in to book and manage your visits." />
      <div className="mb-6 space-y-3 empty:hidden">
        {expired || reason === "session_expired" ? (
          <Notice tone="info">Your session has expired. Please sign in again.</Notice>
        ) : reason === "auth_required" ? (
          <Notice tone="info">Please sign in to continue.</Notice>
        ) : null}
        {params.get("reset") === "sent" ? (
          <Notice tone="success">Check your email for a password reset link.</Notice>
        ) : null}
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
            required
          />
        </Field>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[#2a322c]">
              Password
            </Label>
            <Link
              href="/portal/forgot-password"
              className="text-xs font-medium text-[#1f3d32] underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" className="h-12 w-full rounded-lg text-sm font-semibold tracking-wide" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-8 text-sm text-[#5c635c]">
        New here?{" "}
        <Link
          href={next === "/portal" ? "/portal/register" : `/portal/register?next=${encodeURIComponent(next)}`}
          className="font-semibold text-[#1f3d32] underline-offset-4 hover:underline"
        >
          Create a patient account
        </Link>
      </p>
    </div>
  );
}

export function PatientRegisterForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { register } = usePatientSession();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useRedirectWhenSignedIn(next);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    const input: RegisterInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: (form.gender || undefined) as RegisterInput["gender"],
      address: form.address.trim() || undefined,
    };
    try {
      await register(input);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Heading
        eyebrow="Patient"
        title="Create your account"
        copy="One account for booking, payments, and visit history."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <Field id="name" label="Full name">
          <Input
            id="name"
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            className={fieldClass}
            autoComplete="name"
            minLength={2}
            required
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="email" label="Email">
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              className={fieldClass}
              autoComplete="email"
              required
            />
          </Field>
          <Field id="phone" label="Phone" hint="(optional)">
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              className={fieldClass}
              autoComplete="tel"
              minLength={7}
              maxLength={20}
              placeholder="98XXXXXXXX"
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="dob" label="Date of birth" hint="(optional)">
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth")(e.target.value)}
              className={fieldClass}
              max={new Date().toISOString().slice(0, 10)}
            />
          </Field>
          <Field id="gender" label="Gender" hint="(optional)">
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => set("gender")(e.target.value)}
              className={cn(fieldClass, "w-full border text-sm outline-none focus-visible:ring-2")}
            >
              <option value="">Prefer not to say</option>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
        </div>
        <Field id="address" label="Address" hint="(optional)">
          <Input
            id="address"
            value={form.address}
            onChange={(e) => set("address")(e.target.value)}
            className={fieldClass}
            autoComplete="street-address"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="password" label="Password" hint="(8+ characters)">
            <PasswordInput id="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
          </Field>
          <Field id="confirm" label="Confirm password">
            <PasswordInput id="confirm" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
          </Field>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" className="h-12 w-full rounded-lg text-sm font-semibold tracking-wide" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-8 text-sm text-[#5c635c]">
        Already registered?{" "}
        <Link
          href={next === "/portal" ? "/portal/login" : `/portal/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-[#1f3d32] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function PatientForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/v1/auth/forgot-password", { method: "POST", body: { email: email.trim() }, auth: false });
      router.push("/portal/login?reset=sent");
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Heading
        eyebrow="Patient"
        title="Reset your password"
        copy="Enter the email you registered with. We'll send a link that opens the patient app so you can choose a new password."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
            required
          />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" className="h-12 w-full rounded-lg text-sm font-semibold tracking-wide" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-8 text-sm text-[#5c635c]">
        Remembered it?{" "}
        <Link href="/portal/login" className="font-semibold text-[#1f3d32] underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
