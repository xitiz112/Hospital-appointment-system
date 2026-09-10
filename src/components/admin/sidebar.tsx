"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Stethoscope,
  Users,
  Building2,
  BarChart3,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/schedules", label: "Schedules", icon: Clock },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-200">Hospital</p>
        <p className="mt-1 text-lg font-semibold">Appointment Admin</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10",
                active && "bg-white/15 font-medium",
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="m-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
