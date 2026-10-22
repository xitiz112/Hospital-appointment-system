import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    env: { JWT_ACCESS_SECRET: "test-secret-for-unit-tests-only", TZ: "UTC" },
  },
});
