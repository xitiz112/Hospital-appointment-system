import { prisma } from "@/lib/prisma";
import { SpecializationManager } from "@/components/admin/specialization-manager";

export default async function SpecializationsPage() {
  const [departments, specializations] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.specialization.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Specializations</h1>
        <p className="text-sm text-muted-foreground">Create and assign medical specializations used on doctor profiles</p>
      </div>
      <SpecializationManager
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        specializations={specializations}
      />
    </div>
  );
}
