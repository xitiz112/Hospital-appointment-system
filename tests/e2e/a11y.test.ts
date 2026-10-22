import { readFileSync } from "fs";
import { createRequire } from "module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import { adminLogin, goto, launch, patientSession, trackedPage } from "./browser";

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

type Violation = { id: string; impact: string; help: string; nodes: { target: string[] }[] };

async function audit(page: Page) {
  await page.evaluate(AXE_SOURCE);
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: Violation[] }> } }).axe;
    const r = await axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      count: v.nodes.length,
    }));
  });
}

let browser: Browser;
let page: Page;
const report: Record<string, Awaited<ReturnType<typeof audit>>> = {};

beforeAll(async () => {
  browser = await launch();
  ({ page } = await trackedPage(browser));
});
afterAll(async () => {
  console.log(JSON.stringify(report, null, 2));
  await browser?.close();
});

// Fail on WCAG 2.1 A/AA violations rated serious or critical; minor/moderate are reported only.
function blocking(v: Awaited<ReturnType<typeof audit>>) {
  return v.filter((x) => x.impact === "serious" || x.impact === "critical").map((x) => `${x.id} (${x.count})`);
}

describe("accessibility (axe-core, WCAG 2.1 AA)", () => {
  it.each(["/portal/login", "/portal/register", "/portal/forgot-password", "/login"])("public page %s", async (path) => {
    await goto(page, path);
    report[path] = await audit(page);
    expect(blocking(report[path])).toEqual([]);
  });

  it.each(["/portal", "/portal/doctors", "/portal/appointments", "/portal/profile"])("patient page %s", async (path) => {
    if (!report.__patient) {
      await patientSession(page);
      report.__patient = [];
    }
    await goto(page, path);
    await page.waitForFunction(() => !/Loading…/.test(document.body.innerText), { timeout: 60_000 });
    report[path] = await audit(page);
    expect(blocking(report[path])).toEqual([]);
  });

  it.each(["/dashboard", "/appointments", "/doctors", "/patients", "/payments", "/settings"])("admin page %s", async (path) => {
    if (!report.__admin) {
      await adminLogin(page);
      report.__admin = [];
    }
    await goto(page, path);
    report[path] = await audit(page);
    expect(blocking(report[path])).toEqual([]);
  });
});
