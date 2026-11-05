import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: { baseURL: process.env.PUNNETT_TEST_URL ?? "http://localhost:3000", headless: true, trace: "retain-on-failure" },
});
