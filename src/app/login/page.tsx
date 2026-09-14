import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

const pillars = [
  { index: "01", title: "Roster", copy: "Doctors, rooms, and specialties in one desk." },
  { index: "02", title: "Bookings", copy: "Live visits, reschedules, and the day’s board." },
  { index: "03", title: "Access", copy: "Staff accounts with role-aware controls." },
];

function ClinicMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M14.5 8h3v16h-3zM8 14.5h16v3H8z" fill="#f7f3ea" />
    </svg>
  );
}

function ClinicGeometry() {
  return (
    <svg
      viewBox="0 0 420 280"
      className="h-full w-full text-[#1f3d32]"
      fill="none"
      aria-hidden
    >
      <rect x="24" y="36" width="168" height="196" rx="8" stroke="currentColor" strokeOpacity="0.22" />
      <rect x="48" y="60" width="52" height="40" rx="3" stroke="currentColor" strokeOpacity="0.28" />
      <rect x="112" y="60" width="52" height="40" rx="3" stroke="currentColor" strokeOpacity="0.28" />
      <rect x="48" y="116" width="116" height="48" rx="3" stroke="currentColor" strokeOpacity="0.28" />
      <rect x="48" y="180" width="52" height="28" rx="3" stroke="currentColor" strokeOpacity="0.2" />
      <rect x="112" y="180" width="52" height="28" rx="3" stroke="currentColor" strokeOpacity="0.2" />
      <circle cx="300" cy="118" r="72" stroke="currentColor" strokeOpacity="0.14" />
      <circle cx="300" cy="118" r="44" stroke="currentColor" strokeOpacity="0.2" />
      <path d="M228 118h28l10-22 16 48 12-26h36" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M276 196h88M320 168v56" stroke="currentColor" strokeOpacity="0.18" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-[#f3eee4] text-[#1a1c19]">
      <div className="clinic-grain pointer-events-none absolute inset-0" />
      <div className="clinic-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid min-h-screen max-w-[1280px] lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="order-2 flex flex-col px-6 py-8 sm:px-10 lg:order-1 lg:h-full lg:justify-between lg:px-14 lg:py-14">
          <header className="flex items-center gap-3">
            <ClinicMark className="h-9 w-9 text-[#1f3d32]" />
            <div>
              <p className="text-sm font-semibold text-[#1f3d32]">Kathmandu General</p>
              <p className="text-xs text-[#6a6256]">Hospital operations desk</p>
            </div>
          </header>

          <div className="mt-14 max-w-xl space-y-7 lg:mt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8a6a3d]">
              Staff access
            </p>
            <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-[#141814] sm:text-5xl lg:text-[3.4rem]">
              The day’s clinic, held in one quiet place.
            </h1>
            <p className="max-w-md text-base leading-7 text-[#5c635c]">
              Sign in to coordinate doctors, schedules, appointments, and payments for
              Kathmandu General Hospital — without the paperwork pile.
            </p>

            <ol className="max-w-md divide-y divide-[#d8cfc0] border-y border-[#d8cfc0]">
              {pillars.map((item) => (
                <li key={item.index} className="grid grid-cols-[3rem_1fr] gap-4 py-4">
                  <span className="text-xs font-semibold tracking-[0.16em] text-[#8a6a3d]">{item.index}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c19]">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-[#5c635c]">{item.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-16 hidden h-36 max-w-lg opacity-90 lg:block">
            <ClinicGeometry />
          </div>
        </section>

        <section className="relative order-1 flex items-center border-b border-[#d8cfc0] bg-[#fbf8f2] px-6 py-10 sm:px-10 lg:order-2 lg:border-b-0 lg:border-l lg:px-12">
          <div className="clinic-grain pointer-events-none absolute inset-0 opacity-80" />
          <div className="relative w-full">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}
