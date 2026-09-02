import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const root = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "npx tsx src/index.ts",
      cwd: join(root, "apps/server"),
      url: "http://localhost:8787/api/sources",
      env: {
        PENHUB_DEMO_DIR: join(root, "demo"),
        PORT: "8787",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npx vite --port 5173 --strictPort",
      cwd: join(root, "apps/web"),
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
