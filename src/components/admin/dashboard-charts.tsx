"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarItem, DayPoint, MonthPoint } from "@/lib/dashboard-insights";

// Chart tokens: one validated blue for marks; ink and chrome match the admin theme.
const SERIES = "#2a78d6";
const SERIES_SOFT = "#86b6ef";
const INK = "#1A2332";
const MUTED = "#5A6B7D";
const GRID = "#E6EDF3";
const BASELINE = "#D0DCE8";

const axisTick = { fill: MUTED, fontSize: 11 };

function TooltipCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-[#D0DCE8] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-[#1A2332]">{title}</p>
      {lines.map((l) => (
        <p key={l} className="mt-0.5 tabular-nums text-[#5A6B7D]">
          {l}
        </p>
      ))}
    </div>
  );
}

function ChartTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function VisitsByDayChart({ data }: { data: DayPoint[] }) {
  const todayIndex = data.findIndex((d) => d.isToday);
  const today = data[todayIndex];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#5A6B7D]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES }} />
          Past visits
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_SOFT }} />
          Scheduled
        </span>
      </div>
      <div className="h-64" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={data} margin={{ top: 16, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: BASELINE }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "#E8F1F8" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as DayPoint | undefined;
                if (!active || !p) return null;
                return (
                  <TooltipCard
                    title={p.isToday ? `${p.label} (today)` : p.label}
                    lines={[`${p.count} visit${p.count === 1 ? "" : "s"}`]}
                  />
                );
              }}
            />
            {today ? (
              <ReferenceLine
                x={today.label}
                stroke={MUTED}
                strokeDasharray="3 3"
                label={{ value: "Today", position: "top", fill: MUTED, fontSize: 11 }}
              />
            ) : null}
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={18}>
              {data.map((d, i) => (
                <Cell key={d.key} fill={todayIndex >= 0 && i > todayIndex ? SERIES_SOFT : SERIES} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable caption="Visits per day" rows={data.map((d) => [d.label, String(d.count)])} />
    </div>
  );
}

export function RevenueByMonthChart({ data }: { data: MonthPoint[] }) {
  return (
    <div>
      <div className="h-64" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={data} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: BASELINE }}
              tickFormatter={(v: string) => v.split(" ")[0]}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
            />
            <Tooltip
              cursor={{ fill: "#E8F1F8" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as MonthPoint | undefined;
                if (!active || !p) return null;
                return <TooltipCard title={p.label} lines={[`NPR ${p.amount.toLocaleString()}`]} />;
              }}
            />
            <Bar dataKey="amount" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Revenue per month (NPR)"
        rows={data.map((d) => [d.label, d.amount.toLocaleString()])}
      />
    </div>
  );
}

/** Ranked horizontal bars with the label and value printed, so it reads without hover. */
export function BarList({ items, empty = "No data yet" }: { items: BarItem[]; empty?: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (items.length === 0 || max === 0) {
    return <p className="py-8 text-center text-sm text-[#5A6B7D]">{empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-[#1A2332]">{item.label}</span>
            <span className="shrink-0 tabular-nums font-medium" style={{ color: INK }}>
              {item.display ?? item.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#EEF3F8]">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                minWidth: item.value > 0 ? 4 : 0,
                background: SERIES,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
