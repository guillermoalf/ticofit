import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end walkthrough of the internal system against the local dev server
 * and the real Supabase project. Global setup creates DEMO E2E accounts and the
 * teardown deletes everything it created. Run: `yarn e2e` (with `yarn dev` up).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-CR",
    timezoneId: "America/Costa_Rica",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
