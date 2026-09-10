import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
