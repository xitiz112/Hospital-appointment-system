import { prisma } from "@/lib/prisma";
import { DoctorForm } from "@/components/admin/doctor-form";

export default async function NewDoctorPage() {
  const [departments, specializations] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.specialization.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Add doctor</h1>
      <DoctorForm departments={departments} specializations={specializations} />
    </div>
  );
}
