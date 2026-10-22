import { defineConfig } from "vitest/config";

// Browser tests (puppeteer-core + local Chrome) against a running server.
// Set CHROME_PATH if Chrome is not in the default macOS location.
process.loadEnvFile(".env");

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    environment: "node",
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
