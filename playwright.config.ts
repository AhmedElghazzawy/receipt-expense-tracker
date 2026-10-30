import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Fresh throwaway DB per run; workers inherit it through the environment.
process.env.E2E_DATABASE_PATH ??= join(tmpdir(), `expense-e2e-${Date.now()}`, "app.db");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Mobile first: the primary flow is verified at a 375 px phone viewport.
  projects: [{ name: "mobile", use: { ...devices["iPhone 13 Mini"], browserName: "chromium", viewport: { width: 375, height: 812 } } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: false,
    // Rules and OCR only: no model or network, whatever a local .env says.
    env: {
      DATABASE_PATH: process.env.E2E_DATABASE_PATH,
      PRIVACY_MODE: "local_only",
      LLM_LOCAL_MODEL: "",
      LLM_CLOUD_MODEL: "",
      GEMINI_API_KEY: "",
    },
  },
});
