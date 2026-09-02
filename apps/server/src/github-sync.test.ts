import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { createEmulator } from "emulate";
import { Octokit } from "octokit";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGithubClient } from "./github-client";
import { createCommentStore } from "./comment-store";
import { createGithubSync } from "./github-sync";

describe("createGithubSync", () => {
  let emulator: Awaited<ReturnType<typeof createEmulator>>;
  let octokit: Octokit;
  let sync: ReturnType<typeof createGithubSync>;
  let dir: string;

  beforeAll(async () => {
    emulator = await createEmulator({ service: "github", port: 4002 });
    octokit = new Octokit({
      auth: "test-token",
      baseUrl: "http://localhost:4002",
    });
    await octokit.rest.repos.createForAuthenticatedUser({
      name: "repo",
      auto_init: true,
    });
    await octokit.rest.pulls.create({
      owner: "admin",
      repo: "repo",
      title: "test PR",
      head: "feature",
      base: "main",
    });
  });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "penhub-sync-"));
    const store = createCommentStore(join(dir, "comments.db"));
    const client = createGithubClient({
      baseUrl: "http://localhost:4002",
      token: "test-token",
    });
    sync = createGithubSync({ client, store });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await emulator.close();
  });

  it("syncs GitHub review comments into the local store", async () => {
    // GitHub に review comment を投稿
    await octokit.rest.pulls.createReviewComment({
      owner: "admin",
      repo: "repo",
      pull_number: 1,
      path: "src/login.pen",
      line: 5,
      body: "<!-- penhub:node=0:5:commit=abc123 -->\nコントラストが低い",
    });

    await sync.syncFromGithub({
      owner: "admin",
      repo: "repo",
      pullNumber: 1,
      filePath: "src/login.pen",
    });

    const comments = sync.listComments("src/login.pen");
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      nodeId: "0:5",
      commitId: "abc123",
      body: "コントラストが低い",
      source: "github",
    });
  });

  it("posts a local comment to GitHub as a review comment", async () => {
    const added = sync.addComment({
      filePath: "src/login.pen",
      commitId: "abc123",
      nodeId: "0:3",
      line: 3,
      body: "入力欄のプレースホルダーが薄い",
      author: "tomoasleep",
    });

    await sync.syncToGithub({
      owner: "admin",
      repo: "repo",
      pullNumber: 1,
      commentId: added.id,
    });

    const comments = await octokit.rest.pulls.listReviewComments({
      owner: "admin",
      repo: "repo",
      pull_number: 1,
    });
    const bodies = comments.data.map((c) => c.body);
    expect(bodies.some((b) => b.includes("<!-- penhub:node=0:3:commit=abc123 -->"))).toBe(true);
  });
});
