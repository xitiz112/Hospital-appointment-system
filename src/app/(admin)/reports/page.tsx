import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";
import { subDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ReportsPage() {
  const from = subDays(new Date(), 14);
  const appointments = await prisma.appointment.findMany({
    where: { createdAt: { gte: from } },
    select: { status: true, startAt: true },
  });
  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.SUCCESS, paidAt: { gte: from } },
    select: { amount: true, paidAt: true },
  });

  const byStatus: Record<string, number> = {};
  const byDay: Record<string, { appointments: number; revenue: number }> = {};
  for (const a of appointments) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const key = format(a.startAt, "yyyy-MM-dd");
    byDay[key] ??= { appointments: 0, revenue: 0 };
    byDay[key].appointments += 1;
  }
  for (const p of payments) {
    const key = format(p.paidAt ?? new Date(), "yyyy-MM-dd");
    byDay[key] ??= { appointments: 0, revenue: 0 };
    byDay[key].revenue += Number(p.amount);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Last 14 days — appointments by status and revenue</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(byStatus).map(([status, count]) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{status}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{count}</CardContent>
          </Card>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Appointments</TableHead>
            <TableHead>Revenue (NPR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(byDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, v]) => (
              <TableRow key={date}>
                <TableCell>{date}</TableCell>
                <TableCell>{v.appointments}</TableCell>
                <TableCell>{v.revenue.toLocaleString()}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
