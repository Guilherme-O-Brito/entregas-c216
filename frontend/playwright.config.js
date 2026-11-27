import { defineConfig, devices } from "@playwright/test";

const frontendURL = "http://127.0.0.1:5174";
const apiURL = "http://127.0.0.1:8001";
const baseURL = process.env.E2E_BASE_URL || frontendURL;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "node scripts/e2e-api.js",
          url: `${apiURL}/openapi.json`,
          env: { CORS_ORIGINS: frontendURL },
          gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
        },
        {
          command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
          url: frontendURL,
          env: { VITE_API_URL: apiURL },
        },
      ],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
