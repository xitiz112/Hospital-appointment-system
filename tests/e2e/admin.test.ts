import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import { adminLogin, bodyText, goto, launch, trackedPage } from "./browser";

let browser: Browser;
let page: Page;
let problems: string[];

beforeAll(async () => {
  browser = await launch();
  ({ page, problems } = await trackedPage(browser));
});
afterAll(() => browser?.close());

describe("admin dashboard (E2E)", () => {
  it("redirects anonymous visitors to the login page", async () => {
    await goto(page, "/dashboard");
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  it("signs in and shows the dashboard with its charts", async () => {
    await adminLogin(page);
    await page.waitForSelector("#insights-heading", { timeout: 120_000 });
    const text = await bodyText(page);
    for (const title of ["Visits by day", "Revenue by month", "Appointment status", "Busiest doctors"]) {
      expect(text).toContain(title);
    }
    expect(await page.$$(".recharts-surface")).not.toHaveLength(0);
  });

  const pages = [
    "/appointments",
    "/appointments/new",
    "/doctors",
    "/doctors/new",
    "/patients",
    "/departments",
    "/specializations",
    "/schedules",
    "/payments",
    "/reports",
    "/users",
    "/settings",
  ];

  it.each(pages)("loads %s without server or client errors", async (path) => {
    const before = problems.length;
    const res = await goto(page, path);
    expect(res?.status()).toBeLessThan(400);
    expect(new URL(page.url()).pathname).toBe(path);
    const text = await bodyText(page);
    expect(text).not.toMatch(/Application error|Something went wrong|Unhandled Runtime Error/i);
    expect(problems.slice(before)).toEqual([]);
  });

  it("opens a doctor's detail page from the list", async () => {
    await goto(page, "/doctors");
    const href = await page.$eval('a[href^="/doctors/"]:not([href="/doctors/new"])', (a) => a.getAttribute("href"));
    const res = await goto(page, href!);
    expect(res?.status()).toBe(200);
    expect(await page.$("h1")).not.toBeNull();
  });
});
