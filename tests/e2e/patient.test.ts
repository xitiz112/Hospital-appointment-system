import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import { bodyText, goto, launch, patientSession, trackedPage } from "./browser";

let browser: Browser;
let page: Page;
let problems: string[];

beforeAll(async () => {
  browser = await launch();
  ({ page, problems } = await trackedPage(browser));
});
afterAll(() => browser?.close());

describe("patient portal (E2E)", () => {
  it("shows the sign-in and registration pages", async () => {
    await goto(page, "/portal/login");
    expect(await page.$('input[type="email"]')).not.toBeNull();
    expect(await bodyText(page)).not.toContain("Sign in to the admin dashboard");
    await goto(page, "/portal/register");
    expect(await page.$('input[type="password"]')).not.toBeNull();
  });

  it("rejects a wrong password on the patient sign-in form", async () => {
    await goto(page, "/portal/login");
    await page.type('input[type="email"]', "nobody@hospital.local");
    await page.type('input[type="password"]', "wrong-password");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => /invalid email or password/i.test(document.body.innerText), {
      timeout: 60_000,
    });
  });

  it("opens the portal home once signed in", async () => {
    await patientSession(page);
    await goto(page, "/portal");
    await page.waitForFunction(() => !/Loading…/.test(document.body.innerText), { timeout: 60_000 });
    expect(new URL(page.url()).pathname).toBe("/portal");
  });

  it("finds doctors and shows bookable times (stops before booking)", async () => {
    const before = problems.length;
    await goto(page, "/portal/doctors");
    await page.waitForSelector('a[href^="/portal/doctors/"]', { timeout: 60_000 });
    const href = await page.$eval('a[href^="/portal/doctors/"]', (a) => a.getAttribute("href"));
    await goto(page, href!);
    await page.waitForFunction(() => /\d{1,2}:\d{2}/.test(document.body.innerText), { timeout: 60_000 });
    expect(problems.slice(before)).toEqual([]);
  });

  it.each(["/portal/appointments", "/portal/notifications", "/portal/profile"])(
    "loads %s without errors",
    async (path) => {
      const before = problems.length;
      await goto(page, path);
      expect(new URL(page.url()).pathname).toBe(path);
      expect(problems.slice(before)).toEqual([]);
    },
  );
});
