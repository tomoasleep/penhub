import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSourceStore } from "./source-store";

describe("createSourceStore", () => {
  let dir: string;
  let store: ReturnType<typeof createSourceStore>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "penhub-sources-"));
    store = createSourceStore(join(dir, "sources.db"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("saves and lists sources", () => {
    store.save({
      id: "pr-owner-repo-1",
      type: "pr",
      name: "#1 test PR",
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
      branch: "feature",
    });

    const sources = store.list();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: "pr-owner-repo-1",
      type: "pr",
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
      branch: "feature",
    });
  });

  it("persists across store instances (same db file)", () => {
    const dbPath = join(dir, "sources.db");
    const first = createSourceStore(dbPath);
    first.save({
      id: "pr-owner-repo-2",
      type: "pr",
      name: "#2 another PR",
      owner: "owner",
      repo: "repo",
      pullNumber: 2,
    });

    const second = createSourceStore(dbPath);
    const sources = second.list();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: "pr-owner-repo-2", pullNumber: 2 });
  });

  it("upserts a source with the same id", () => {
    store.save({
      id: "pr-owner-repo-1",
      type: "pr",
      name: "#1 old",
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
    });
    store.save({
      id: "pr-owner-repo-1",
      type: "pr",
      name: "#1 new",
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
    });

    const sources = store.list();
    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe("#1 new");
  });

  it("removes a source by id", () => {
    store.save({
      id: "pr-owner-repo-1",
      type: "pr",
      name: "#1 test PR",
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
    });

    store.remove("pr-owner-repo-1");
    expect(store.list()).toHaveLength(0);
  });
});
