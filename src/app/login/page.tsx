import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { Calendar, Users, Activity, Shield } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Hospital Appointment System</h1>
              <p className="text-teal-100">Kathmandu General Hospital</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="mb-6 text-3xl font-bold text-white">
              Streamline your healthcare operations
            </h2>
            <p className="text-lg text-teal-100">
              Comprehensive admin dashboard for managing appointments, patients, doctors, and hospital operations.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-white">Smart Scheduling</h3>
                <p className="text-sm text-teal-100">
                  Manage appointments efficiently with real-time availability and automated reminders.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-white">Patient Management</h3>
                <p className="text-sm text-teal-100">
                  Complete patient records with history, appointments, and payment tracking.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-white">Secure & Compliant</h3>
                <p className="text-sm text-teal-100">
                  Enterprise-grade security with role-based access and data encryption.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-teal-200">
          © 2026 Kathmandu General Hospital. All rights reserved.
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 lg:w-1/2">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
