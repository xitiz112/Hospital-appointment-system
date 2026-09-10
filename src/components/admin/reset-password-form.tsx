"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.get("token"), password }),
    });
    const json = await res.json();
    setMessage(json.success ? "Password updated. You can sign in now." : json.error?.message);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          {message ? <p className="text-sm">{message}</p> : null}
          <Button type="submit" className="w-full">
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
