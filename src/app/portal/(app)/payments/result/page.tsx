import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Landing page after the eSewa / Khalti redirect routes verify a payment. */
export default async function PaymentResultPage({ searchParams }: PageProps<"/portal/payments/result">) {
  const { status, appointmentId } = await searchParams;
  const ok = status === "success";
  const appointmentHref = typeof appointmentId === "string" ? `/portal/appointments/${appointmentId}` : null;

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
      {ok ? (
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
      ) : (
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
      )}
      <h1 className="mt-4 text-xl font-semibold">{ok ? "Payment successful" : "Payment not completed"}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {ok
          ? "Your appointment is confirmed. Your receipt is on the appointment page."
          : "We couldn't confirm your payment, so your appointment is still awaiting payment. You can try again from the appointment page."}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button asChild>
          <Link href={appointmentHref ?? "/portal/appointments"}>
            {appointmentHref ? "View appointment" : "Go to my appointments"}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/portal">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
