import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CashPayButton } from "@/components/admin/cash-pay";
import { formatKtm, statusVariant } from "@/lib/format";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ esewa?: string; khalti?: string }>;
}) {
  const q = await searchParams;
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      appointment: {
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">eSewa, Khalti, and cash receipts</p>
      </div>
      {q.esewa || q.khalti ? (
        <p className="text-sm">
          Gateway return: {q.esewa ?? q.khalti}
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatKtm(p.createdAt)}</TableCell>
              <TableCell>{p.appointment.patient.user.name}</TableCell>
              <TableCell>{p.appointment.doctor.user.name}</TableCell>
              <TableCell>NPR {Number(p.amount).toLocaleString()}</TableCell>
              <TableCell>{p.provider}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
              </TableCell>
              <TableCell>{p.receiptNumber ?? "—"}</TableCell>
              <TableCell>
                <CashPayButton id={p.id} payable={p.status !== "SUCCESS"} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
