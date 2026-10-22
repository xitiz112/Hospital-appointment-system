import { defineConfig } from "vitest/config";

// Black-box API tests against a running server (API_BASE_URL, default http://localhost:3000).
// They only read data or send requests that are rejected before any write.
// .env gives the tests JWT_ACCESS_SECRET (to sign a patient token if the seeded login fails).
process.loadEnvFile(".env");

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
