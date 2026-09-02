import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createEmulator } from "emulate";
import { Octokit } from "octokit";
import { createGithubClient } from "./github-client";

describe("createGithubClient", () => {
  let emulator: Awaited<ReturnType<typeof createEmulator>>;
  let client: ReturnType<typeof createGithubClient>;
  let octokit: Octokit;

  beforeAll(async () => {
    emulator = await createEmulator({ service: "github", port: 4001 });
    client = createGithubClient({
      baseUrl: "http://localhost:4001",
      token: "test-token",
    });
    octokit = new Octokit({
      auth: "test-token",
      baseUrl: "http://localhost:4001",
    });

    // emulate は stateful なので、リポジトリと PR を事前に作成する
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

  afterAll(async () => {
    await emulator.close();
  });

  it("lists PR files", async () => {
    const files = await client.listPrFiles("admin", "repo", 1);
    expect(Array.isArray(files)).toBe(true);
  });

  it("creates a review comment", async () => {
    const comment = await client.createReviewComment({
      owner: "admin",
      repo: "repo",
      pullNumber: 1,
      commitId: "abc123",
      path: "src/login.pen",
      line: 5,
      body: "<!-- penhub:node=0:5:commit=abc123 -->\nコメント",
    });
    expect(comment.id).toBeTruthy();
  });

  it("lists review comments", async () => {
    const comments = await client.listReviewComments("admin", "repo", 1);
    expect(Array.isArray(comments)).toBe(true);
  });
});
