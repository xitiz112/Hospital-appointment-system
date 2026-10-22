const steps = [
  { index: "01", title: "Find a doctor", copy: "Search by department, specialty, fee, or name." },
  { index: "02", title: "Pick a time", copy: "Live open slots in Nepal time — no phone queue." },
  { index: "03", title: "Pay and go", copy: "Pay with eSewa and keep your receipt on hand." },
];

function ClinicMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M14.5 8h3v16h-3zM8 14.5h16v3H8z" fill="#f7f3ea" />
    </svg>
  );
}

export default function PatientAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f3eee4] text-[#1a1c19]">
      <div className="clinic-grain pointer-events-none absolute inset-0" />
      <div className="clinic-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid min-h-screen max-w-[1280px] lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <section className="order-2 flex flex-col px-6 py-8 sm:px-10 lg:order-1 lg:h-full lg:px-14 lg:py-14">
          <header className="flex items-center gap-3">
            <ClinicMark className="h-9 w-9 text-[#1f3d32]" />
            <div>
              <p className="text-sm font-semibold text-[#1f3d32]">Kathmandu General</p>
              <p className="text-xs text-[#6a6256]">Patient portal</p>
            </div>
          </header>

          <div className="mt-14 max-w-xl space-y-7 lg:my-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8a6a3d]">
              Patient access
            </p>
            <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-[#141814] sm:text-5xl lg:text-[3.2rem]">
              Your next visit, booked in a few minutes.
            </h1>
            <p className="max-w-md text-base leading-7 text-[#5c635c]">
              See which doctors are free, reserve a slot, and keep your appointments,
              payments, and receipts in one place.
            </p>

            <ol className="max-w-md divide-y divide-[#d8cfc0] border-y border-[#d8cfc0]">
              {steps.map((item) => (
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
        </section>

        <section className="relative order-1 flex items-center border-b border-[#d8cfc0] bg-[#fbf8f2] px-6 py-10 sm:px-10 lg:order-2 lg:border-b-0 lg:border-l lg:px-12">
          <div className="clinic-grain pointer-events-none absolute inset-0 opacity-80" />
          <div className="relative w-full">{children}</div>
        </section>
      </div>
    </div>
  );
}
