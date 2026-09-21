import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ScheduleEditor } from "@/components/admin/schedule-editor";

export default async function SchedulesPage() {
  const since = subDays(new Date(), 7);
  const doctors = await prisma.doctor.findMany({
    where: { user: { status: "ACTIVE" } },
    orderBy: { user: { name: "asc" } },
    take: 100,
    select: {
      id: true,
      user: { select: { name: true } },
      schedules: { select: { weekday: true, startMin: true, endMin: true } },
      breaks: { select: { weekday: true, startMin: true, endMin: true, label: true } },
      unavailability: {
        where: { endAt: { gte: since } },
        orderBy: { startAt: "desc" },
        take: 40,
        select: { id: true, startAt: true, endAt: true, reason: true },
      },
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          Working hours, breaks, leave, and generated slot preview (Asia/Kathmandu)
        </p>
      </div>
      <ScheduleEditor
        doctors={doctors.map((d) => ({
          id: d.id,
          name: d.user.name,
          schedules: d.schedules,
          breaks: d.breaks,
          unavailability: d.unavailability.map((u) => ({
            id: u.id,
            startAt: u.startAt.toISOString(),
            endAt: u.endAt.toISOString(),
            reason: u.reason,
          })),
        }))}
      />
    </div>
  );
}
