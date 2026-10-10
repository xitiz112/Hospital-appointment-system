import { ReceiptView } from "@/components/patient/receipt-view";

export default async function PatientReceiptPage({ params }: PageProps<"/portal/receipts/[paymentId]">) {
  const { paymentId } = await params;
  return <ReceiptView paymentId={paymentId} />;
}
