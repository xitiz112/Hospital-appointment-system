import { prisma } from "@/lib/prisma";
import { ScheduleEditor } from "@/components/admin/schedule-editor";

export default async function SchedulesPage() {
  const doctors = await prisma.doctor.findMany({
    include: { user: true, schedules: true, breaks: true, unavailability: { orderBy: { startAt: "desc" } } },
    orderBy: { user: { name: "asc" } },
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
