"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Briefcase, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { minutesToHHmm } from "@/lib/serialize";
import { formatNpr, WEEKDAY_SHORT, type Department, type DoctorSummary, type Specialization } from "@/lib/patient-types";
import { Avatar, Empty, ErrorNote, Loading, PageHeader, useApi } from "@/components/patient/ui";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

const SORTS = [
  { value: "name", label: "Name" },
  { value: "fee", label: "Lowest fee" },
  { value: "fee_desc", label: "Highest fee" },
  { value: "experience", label: "Most experienced" },
];

const selectClass =
  "h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function workingDays(schedules: DoctorSummary["schedules"]) {
  const days = [...new Set(schedules.map((s) => s.weekday))].sort();
  if (!days.length) return null;
  return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
}

function hoursRange(schedules: DoctorSummary["schedules"]) {
  if (!schedules.length) return null;
  const start = Math.min(...schedules.map((s) => s.startMin));
  const end = Math.max(...schedules.map((s) => s.endMin));
  return `${minutesToHHmm(start)}–${minutesToHHmm(end)}`;
}

export function DoctorSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const departmentId = params.get("departmentId") ?? "";
  const specializationId = params.get("specializationId") ?? "";
  const sort = params.get("sort") ?? "name";
  const availableOnly = params.get("available") === "true";
  const maxFee = params.get("maxFee") ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1));

  const [query, setQuery] = useState(q);

  const departments = useApi<Department[]>("/api/v1/departments");
  const specializations = useApi<Specialization[]>("/api/v1/specializations");

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Debounce free-text search into the URL.
  useEffect(() => {
    if (query.trim() === q) return;
    const t = setTimeout(() => update({ q: query.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const apiPath = useMemo(() => {
    const s = new URLSearchParams({ sort, page: String(page), pageSize: String(PAGE_SIZE) });
    if (q) s.set("q", q);
    if (departmentId) s.set("departmentId", departmentId);
    if (specializationId) s.set("specializationId", specializationId);
    if (availableOnly) s.set("available", "true");
    if (maxFee) s.set("maxFee", maxFee);
    return `/api/v1/doctors?${s.toString()}`;
  }, [q, departmentId, specializationId, sort, availableOnly, maxFee, page]);

  const doctors = useApi<DoctorSummary[]>(apiPath);
  const total = Number(doctors.meta?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const visibleSpecializations = (specializations.data ?? []).filter(
    (s) => !departmentId || !s.department || s.department.id === departmentId,
  );
  const hasFilters = Boolean(q || departmentId || specializationId || availableOnly || maxFee || sort !== "name");

  return (
    <div>
      <PageHeader
        eyebrow="Book a visit"
        title="Find a doctor"
        description="Search by name, department, or specialty, then choose an open time."
      />

      <div className="mb-6 space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors, departments, or specialties"
            className="h-11 pl-9"
            aria-label="Search doctors"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className={selectClass}
            value={departmentId}
            onChange={(e) => update({ departmentId: e.target.value || null, specializationId: null })}
            aria-label="Department"
          >
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={specializationId}
            onChange={(e) => update({ specializationId: e.target.value || null })}
            aria-label="Specialization"
          >
            <option value="">All specializations</option>
            {visibleSpecializations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={maxFee}
            onChange={(e) => update({ maxFee: e.target.value || null })}
            aria-label="Maximum fee"
          >
            <option value="">Any fee</option>
            <option value="500">Up to NPR 500</option>
            <option value="1000">Up to NPR 1,000</option>
            <option value="1500">Up to NPR 1,500</option>
            <option value="2000">Up to NPR 2,000</option>
          </select>
          <select
            className={selectClass}
            value={sort}
            onChange={(e) => update({ sort: e.target.value === "name" ? null : e.target.value })}
            aria-label="Sort by"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => update({ available: e.target.checked ? "true" : null })}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Accepting bookings only
          </label>
          {hasFilters ? (
            <button
              type="button"
              className="text-sm font-medium text-accent hover:underline"
              onClick={() => {
                setQuery("");
                router.replace(pathname, { scroll: false });
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {doctors.error ? <ErrorNote message={doctors.error} onRetry={doctors.reload} /> : null}

      {doctors.loading && !doctors.data ? (
        <Loading label="Finding doctors…" />
      ) : doctors.data && doctors.data.length === 0 ? (
        <Empty title="No doctors match these filters">Try a different department or clear the filters.</Empty>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} doctor{total === 1 ? "" : "s"}
          </p>
          <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", doctors.loading && "opacity-60")}>
            {(doctors.data ?? []).map((d) => (
              <Link
                key={d.id}
                href={`/portal/doctors/${d.id}`}
                className="group flex flex-col rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-accent/60"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={d.user.name} src={d.user.imageUrl} className="h-14 w-14" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground group-hover:text-primary">{d.user.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {d.specialization?.name ?? d.department.name}
                    </p>
                    {d.qualifications ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.qualifications}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mb-4 mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    {d.experienceYears} yr experience · {d.department.name}
                  </p>
                  {d.location ? (
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {d.location}
                    </p>
                  ) : null}
                  {workingDays(d.schedules) ? (
                    <p>
                      {workingDays(d.schedules)} · {hoursRange(d.schedules)}
                    </p>
                  ) : null}
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-4">
                  <span className="text-sm font-semibold text-foreground">
                    {Number(d.consultationFee) > 0 ? formatNpr(d.consultationFee) : "Free"}
                  </span>
                  {d.isAvailable ? (
                    <span className="text-xs font-semibold text-accent">Book →</span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">Not taking bookings</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {pages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => update({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
