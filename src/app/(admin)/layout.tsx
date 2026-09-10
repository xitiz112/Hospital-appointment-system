import { Providers } from "@/components/providers";
import { AdminSidebar } from "@/components/admin/sidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </Providers>
  );
}
