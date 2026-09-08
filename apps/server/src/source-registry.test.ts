import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSourceRegistry } from "./source-registry";
import { createSourceStore } from "./source-store";
import type { GithubClient } from "./github-client";

function fakeGithubClient(): GithubClient {
  return {
    async getPr() {
      return {
        number: 1,
        title: "test PR",
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
      return '{"version":"1"}';
    },
    async createReviewComment() {
      return { id: 1 };
    },
    async listReviewComments() {
      return [];
    },
  };
}

describe("createSourceRegistry", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "penhub-reg-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("registers and lists sources", () => {
    const registry = createSourceRegistry();
    registry.registerFolder("folder-1", dir);

    const sources = registry.list();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: "folder-1", type: "folder" });
  });

  it("returns a file tree for a registered source", async () => {
    writeFileSync(join(dir, "a.pen"), "{}");
    const registry = createSourceRegistry();
    registry.registerFolder("folder-1", dir);

    const tree = await registry.listFiles("folder-1");
    expect(tree).toEqual([{ name: "a.pen", path: "a.pen", type: "file" }]);
  });

  it("throws for an unknown source", async () => {
    const registry = createSourceRegistry();
    await expect(registry.listFiles("nope")).rejects.toThrow();
  });

  it("persists a registered PR source and restores it on a new registry", async () => {
    const dbPath = join(dir, "sources.db");
    const store = createSourceStore(dbPath);
    const first = createSourceRegistry({ store, githubClient: fakeGithubClient() });
    await first.registerPr("pr-owner-repo-1", "owner", "repo", 1, fakeGithubClient());

    const second = createSourceRegistry({
      store: createSourceStore(dbPath),
      githubClient: fakeGithubClient(),
    });
    const sources = second.list();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: "pr-owner-repo-1", type: "pr" });
  });

  it("lazily loads files for a restored PR source", async () => {
    const dbPath = join(dir, "sources.db");
    const store = createSourceStore(dbPath);
    const first = createSourceRegistry({ store, githubClient: fakeGithubClient() });
    await first.registerPr("pr-owner-repo-1", "owner", "repo", 1, fakeGithubClient());

    const second = createSourceRegistry({
      store: createSourceStore(dbPath),
      githubClient: fakeGithubClient(),
    });
    const files = await second.listFiles("pr-owner-repo-1");
    expect(files).toEqual([
      {
        name: "src",
        path: "src",
        type: "dir",
        children: [{ name: "login.pen", path: "src/login.pen", type: "file" }],
      },
    ]);
  });
});
