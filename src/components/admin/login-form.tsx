"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Shield, ArrowRight } from "lucide-react";

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@hospital.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: params.get("callbackUrl") ?? "/dashboard",
    });
    setPending(false);
    if (res?.error) {
      setError("Invalid admin credentials.");
      return;
    }
    window.location.href = res?.url ?? "/dashboard";
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base">Sign in to your admin dashboard</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
              placeholder="admin@hospital.local"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
              placeholder="Enter your password"
            />
          </div>
          {error ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <Shield className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}
          <Button
            type="submit"
            className="h-11 w-full bg-gradient-to-r from-teal-500 to-teal-600 text-base font-medium shadow-lg shadow-teal-500/30 transition-all hover:shadow-xl hover:shadow-teal-500/40"
            disabled={pending}
          >
            {pending ? (
              "Signing in…"
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Secure admin access</span>
        </div>
      </CardContent>
    </Card>
  );
}
