import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";
import { AdminSidebar } from "@/components/admin/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/dashboard");
  }
  return (
    <Providers>
      <div className="flex min-h-screen bg-[#F5F8FB]">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </Providers>
  );
}
