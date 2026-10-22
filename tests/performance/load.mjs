// Load test for read-only API endpoints.
// Usage: node tests/performance/load.mjs [baseUrl] [connections] [seconds]
// Run it against a production build (`npm run build && npx next start`), not `next dev`.
import autocannon from "autocannon";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const CONNECTIONS = Number(process.argv[3] ?? 10);
const DURATION = Number(process.argv[4] ?? 20);

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  return res.json();
}

const doctors = await get("/api/v1/doctors?pageSize=1");
const doctorId = doctors.data[0].id;
const next = new Date();
next.setUTCDate(next.getUTCDate() + ((8 - next.getUTCDay()) % 7 || 7)); // next Monday
const date = next.toISOString().slice(0, 10);

const scenarios = [
  { name: "hospital info", path: "/api/v1/hospitals/current" },
  { name: "departments", path: "/api/v1/departments" },
  { name: "doctor search", path: "/api/v1/doctors?pageSize=20" },
  { name: "doctor slots", path: `/api/v1/doctors/${doctorId}/slots?date=${date}` },
  { name: "patient login page", path: "/portal/login" },
];

const rows = [];
for (const s of scenarios) {
  const r = await autocannon({ url: `${BASE}${s.path}`, connections: CONNECTIONS, duration: DURATION });
  rows.push({
    scenario: s.name,
    "req/s": Math.round(r.requests.average * 10) / 10,
    "p50 ms": r.latency.p50,
    "p90 ms": r.latency.p90,
    "p99 ms": r.latency.p99,
    "max ms": r.latency.max,
    requests: r.requests.total,
    "non-2xx": r.non2xx,
    errors: r.errors,
    timeouts: r.timeouts,
  });
  console.error(`done: ${s.name}`);
}
console.log(`\n${BASE} - ${CONNECTIONS} connections x ${DURATION}s per scenario`);
console.table(rows);
