"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKtm } from "@/lib/format";
import { formatNpr, type Receipt } from "@/lib/patient-types";
import { ErrorNote, Loading, useApi } from "@/components/patient/ui";

const PROVIDER_LABEL: Record<string, string> = { ESEWA: "eSewa", KHALTI: "Khalti", CASH: "Cash at hospital" };

export function ReceiptView({ paymentId }: { paymentId: string }) {
  const receipt = useApi<Receipt>(`/api/v1/payments/${paymentId}/receipt`);

  if (receipt.loading) return <Loading label="Loading receipt…" />;
  if (!receipt.data) return <ErrorNote message={receipt.error ?? "Receipt not found"} onRetry={receipt.reload} />;

  const r = receipt.data;
  const rows = [
    ["Patient", r.patient],
    ["Doctor", r.doctor],
    ["Department", r.department],
    ["Appointment", formatKtm(r.appointmentStart, "EEEE, d MMMM yyyy · h:mm a")],
    ["Paid on", formatKtm(r.paidAt, "d MMMM yyyy · h:mm a")],
    ["Method", PROVIDER_LABEL[r.provider] ?? r.provider],
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <article className="rounded-xl border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Payment receipt</p>
            <h1 className="mt-1 text-xl font-semibold">{r.hospital}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Receipt no.</p>
            <p className="font-mono text-sm font-semibold">{r.receiptNumber}</p>
          </div>
        </header>
        <dl className="divide-y text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-secondary/70 px-4 py-4">
          <span className="text-sm font-semibold">Amount paid</span>
          <span className="text-lg font-semibold">{formatNpr(r.amount)}</span>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Show this receipt at the front desk on the day of your visit.
        </p>
      </article>

      <p className="text-center text-sm print:hidden">
        <Link href="/portal/appointments" className="font-medium text-accent hover:underline">
          Back to appointments
        </Link>
      </p>
    </div>
  );
}
