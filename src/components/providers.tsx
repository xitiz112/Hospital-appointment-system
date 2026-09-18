"use client";

import { SessionProvider } from "next-auth/react";
import { SessionGuard } from "@/components/admin/session-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}
