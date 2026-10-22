import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { ACCOUNTS, BASE_URL, PASSWORD, login, patientToken } from "../integration/helpers";

export { BASE_URL };

const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: true });
}

/** Opens a page that records console errors, uncaught exceptions and 5xx responses. */
export async function trackedPage(browser: Browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const problems: string[] = [];
  page.on("console", (m) => {
    // Failed resources are reported with their URL by the response handler below.
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) {
      problems.push(`console: ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${(e as Error).message}`));
  page.on("response", (r) => {
    const path = r.url().replace(BASE_URL, "");
    // Without BLOB_READ_WRITE_TOKEN, images stored in Vercel Blob cannot be served locally.
    const blobUnavailable = !process.env.BLOB_READ_WRITE_TOKEN && path.startsWith("/api/v1/blob/");
    if (r.status() >= 400 && !blobUnavailable) problems.push(`${r.status()} ${path}`);
  });
  return { page, problems };
}

export async function goto(page: Page, path: string) {
  const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle2", timeout: 120_000 });
  return res;
}

export async function adminLogin(page: Page) {
  await goto(page, "/login");
  await page.$eval('input[type="email"]', (el) => ((el as HTMLInputElement).value = ""));
  await page.type('input[type="email"]', ACCOUNTS.admin);
  await page.$eval("#password", (el) => ((el as HTMLInputElement).value = ""));
  await page.type("#password", PASSWORD);
  await Promise.all([
    page.waitForFunction(() => location.pathname.startsWith("/dashboard"), { timeout: 120_000 }),
    page.click('button[type="submit"]'),
  ]);
}

/** Signs the patient portal in by storing a session the way the portal does. */
export async function patientSession(page: Page) {
  const admin = await login(ACCOUNTS.admin);
  const session = await login(ACCOUNTS.patient).catch(() => patientToken(admin.accessToken));
  await goto(page, "/portal/login");
  await page.evaluate((s) => {
    localStorage.setItem("has.patient.session", JSON.stringify({ accessToken: s, refreshToken: "e2e-no-refresh" }));
  }, session.accessToken);
}

export async function bodyText(page: Page) {
  return page.evaluate(() => document.body.innerText);
}
