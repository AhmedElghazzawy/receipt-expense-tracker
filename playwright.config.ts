import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Fresh throwaway DB per run; workers inherit it through the environment.
process.env.E2E_DATABASE_PATH ??= join(tmpdir(), `expense-e2e-${Date.now()}`, "app.db");
const e2eTmp = join(dirname(process.env.E2E_DATABASE_PATH), "tmp");
mkdirSync(e2eTmp, { recursive: true });

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
      // Fresh temp dir like a new install: nothing cached from earlier runs (e.g. OCR language data).
      TMPDIR: e2eTmp,
      PRIVACY_MODE: "local_only",
      LLM_LOCAL_MODEL: "",
      LLM_CLOUD_MODEL: "",
      GEMINI_API_KEY: "",
    },
  },
});
