"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarCheck, CalendarClock, CalendarX, CreditCard, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/patient-client";
import { formatKtm } from "@/lib/format";
import type { Notification } from "@/lib/patient-types";
import { NOTIFICATIONS_CHANGED } from "@/components/patient/shell";
import { Empty, ErrorNote, Loading, PageHeader, useApi } from "@/components/patient/ui";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = {
  APPOINTMENT_BOOKED: CalendarClock,
  APPOINTMENT_CONFIRMED: CalendarCheck,
  APPOINTMENT_CANCELLED: CalendarX,
  APPOINTMENT_RESCHEDULED: CalendarClock,
  APPOINTMENT_REMINDER: Bell,
  PAYMENT_SUCCESS: CreditCard,
  PAYMENT_FAILED: TriangleAlert,
};

function targetFor(n: Notification) {
  const data = n.data ?? {};
  if (typeof data.appointmentId === "string") return `/portal/appointments/${data.appointmentId}`;
  if (n.type === "PAYMENT_SUCCESS" && typeof data.paymentId === "string") return `/portal/receipts/${data.paymentId}`;
  return null;
}

export default function PatientNotificationsPage() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useApi<Notification[]>(`/api/v1/notifications${unreadOnly ? "?unread=true" : ""}`);
  const unreadCount = Number(list.meta?.unreadCount ?? 0);

  function changed() {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    list.reload();
  }

  async function markAll() {
    setError(null);
    try {
      await api("/api/v1/notifications/read-all", { method: "POST" });
      changed();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function open(n: Notification) {
    if (!n.readAt) {
      await api(`/api/v1/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => null);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    }
    const href = targetFor(n);
    if (href) router.push(href);
    else list.reload();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Booking confirmations, payment results, reminders, and changes to your visits."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
              {unreadOnly ? "Show all" : "Unread only"}
            </Button>
            <Button size="sm" onClick={markAll} disabled={!unreadCount}>
              Mark all read
            </Button>
          </>
        }
      />

      {error || list.error ? <ErrorNote message={error ?? list.error ?? ""} onRetry={list.reload} /> : null}

      {list.loading && !list.data ? (
        <Loading label="Loading notifications…" />
      ) : !list.data?.length ? (
        <Empty title={unreadOnly ? "No unread notifications" : "No notifications yet"}>
          We&apos;ll let you know when something changes with your appointments.
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-white shadow-sm">
          {list.data.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cn(
                    "flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-secondary/50 sm:px-5",
                    !n.readAt && "bg-[#f3f8fc]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      n.type === "PAYMENT_FAILED" || n.type === "APPOINTMENT_CANCELLED"
                        ? "bg-red-50 text-destructive"
                        : "bg-secondary text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={cn("text-sm", n.readAt ? "font-medium" : "font-semibold")}>{n.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatKtm(n.createdAt, "d MMM, h:mm a")}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                  </span>
                  {!n.readAt ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
