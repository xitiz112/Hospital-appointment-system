"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * When the Auth.js session expires while the admin is on a protected page,
 * send them to login with a clear session-expired message.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const hadSession = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      hadSession.current = true;
      return;
    }
    if (status === "unauthenticated" && hadSession.current) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?callbackUrl=${next}&reason=session_expired`);
    }
  }, [status, pathname, router]);

  return <>{children}</>;
}
