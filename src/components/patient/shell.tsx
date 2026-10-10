"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, Home, LogOut, Stethoscope, UserRound } from "lucide-react";
import { api } from "@/lib/patient-client";
import { usePatientSession } from "@/components/patient/session";
import { Avatar } from "@/components/patient/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/doctors", label: "Find a doctor", icon: Stethoscope },
  { href: "/portal/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/portal/notifications", label: "Notifications", icon: Bell },
  { href: "/portal/profile", label: "Profile", icon: UserRound },
];

/** Fired by pages that change read state so the badge refreshes. */
export const NOTIFICATIONS_CHANGED = "patient-notifications-changed";

function isActive(pathname: string, href: string) {
  return href === "/portal" ? pathname === "/portal" : pathname === href || pathname.startsWith(`${href}/`);
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  const { user, hospital, status, expired, logout } = usePatientSession();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (status === "anonymous") {
      const reason = expired ? "session_expired" : "auth_required";
      router.replace(`/portal/login?reason=${reason}&next=${encodeURIComponent(pathname)}`);
    }
  }, [status, expired, router, pathname]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const load = () =>
      api<unknown[]>("/api/v1/notifications?unread=true")
        .then((r) => setUnread(Number(r.meta?.unreadCount ?? 0)))
        .catch(() => null);
    load();
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, load);
  }, [status, pathname]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
        Opening your portal…
      </div>
    );
  }

  async function onSignOut() {
    await logout();
    router.replace("/portal/login");
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 text-primary" aria-hidden>
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path d="M14.5 8h3v16h-3zM8 14.5h16v3H8z" fill="#f5f8fb" />
            </svg>
            <span className="truncate text-sm font-semibold text-primary">
              {hospital?.name ?? "Patient portal"}
            </span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Portal">
            {NAV.slice(0, 3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary",
                  isActive(pathname, item.href) && "bg-secondary text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/portal/notifications"
              className={cn(
                "relative hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary md:flex",
                isActive(pathname, "/portal/notifications") && "bg-secondary text-primary",
              )}
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Link
              href="/portal/profile"
              className={cn(
                "hidden items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary md:flex",
                isActive(pathname, "/portal/profile") && "bg-secondary",
              )}
            >
              <Avatar name={user.name} src={user.imageUrl} className="h-7 w-7 text-[11px]" />
              <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">{user.name}</span>
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-white md:hidden"
        aria-label="Portal"
      >
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground",
                active && "text-primary",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label === "Find a doctor" ? "Doctors" : item.label === "Notifications" ? "Alerts" : item.label}
              {item.href === "/portal/notifications" && unread ? (
                <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-destructive" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
