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
  Shield,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const groups = [
  {
    title: "Desk",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/appointments", label: "Appointments", icon: CalendarDays },
      { href: "/schedules", label: "Schedules", icon: Clock },
    ],
  },
  {
    title: "People",
    links: [
      { href: "/patients", label: "Patients", icon: Users },
      { href: "/doctors", label: "Doctors", icon: Stethoscope },
      { href: "/users", label: "Users", icon: Shield },
    ],
  },
  {
    title: "Clinic",
    links: [
      { href: "/departments", label: "Departments", icon: Building2 },
      { href: "/specializations", label: "Specializations", icon: Briefcase },
    ],
  },
  {
    title: "Ledger",
    links: [
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    links: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-col overflow-y-auto bg-[#1B4F72] text-[#F5F8FB]">
      <div className="flex items-center gap-3 px-5 py-6">
        <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 text-[#E8F1F8]" aria-hidden>
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <path d="M14.5 8h3v16h-3zM8 14.5h16v3H8z" fill="#1B4F72" />
        </svg>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A8C5D6]">KGH</p>
          <p className="truncate text-sm font-semibold leading-tight">Clinic desk</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 px-3 pb-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A8C5D6]">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "clinic-focus flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#D6E4EE] transition-colors hover:bg-white/10 hover:text-white",
                      active && "bg-[#E8F1F8] font-medium text-[#1B4F72] hover:bg-[#E8F1F8] hover:text-[#1B4F72]",
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="clinic-focus m-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#D6E4EE] hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
