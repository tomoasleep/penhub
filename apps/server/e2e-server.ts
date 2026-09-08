import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "./src/app";
import type { GithubClient } from "./src/github-client";

const demoContent = readFileSync(
  resolve(process.env.PENHUB_DEMO_DIR ?? "", "penhub-demo.pen"),
  "utf-8",
);

const mockClient: GithubClient = {
  async getPr() {
    return {
      number: 1,
      title: "E2E PR",
      head: { ref: "feature", sha: "abc123" },
      base: { ref: "main" },
    };
  },
  async listPrFiles() {
    return [
      { filename: "src/login.pen", status: "modified", additions: 1, deletions: 0, changes: 1 },
    ];
  },
  async getFileContent() {
    return demoContent;
  },
  async createReviewComment() {
    return { id: 1 };
  },
  async listReviewComments() {
    return [];
  },
};

const dbPath = process.env.PENHUB_DB ?? resolve(process.cwd(), "penhub.db");
const app = createApp({ dbPath, githubClient: mockClient });

const demoDir = process.env.PENHUB_DEMO_DIR;
if (demoDir) {
  app.registerFolder("demo", resolve(demoDir));
}

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`penhub e2e server listening on http://localhost:${info.port}`);
});
