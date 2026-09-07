import { describe, it, expect } from "vitest";
import { createPrSource } from "./pr-source";
import type { GithubClient, PrFile } from "./github-client";

function fakeClient(files: PrFile[]): GithubClient {
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
      return files;
    },
    async getFileContent(_owner, _repo, path) {
      return `content of ${path}`;
    },
    async createReviewComment() {
      return { id: 1 };
    },
    async listReviewComments() {
      return [];
    },
  };
}

describe("createPrSource", () => {
  it("builds a file tree from PR files", async () => {
    const client = fakeClient([
      { filename: "src/login.pen", status: "modified", additions: 1, deletions: 0, changes: 1 },
      { filename: "src/theme.pen", status: "added", additions: 2, deletions: 0, changes: 2 },
    ]);
    const pr = await createPrSource("pr-1", "owner", "repo", 1, client);
    expect(pr.source).toMatchObject({
      id: "pr-1",
      type: "pr",
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
    });
    expect(pr.listFiles()).toEqual([
      {
        name: "src",
        path: "src",
        type: "dir",
        children: [
          { name: "login.pen", path: "src/login.pen", type: "file" },
          { name: "theme.pen", path: "src/theme.pen", type: "file" },
        ],
      },
    ]);
  });

  it("reads file content from the PR head", async () => {
    const client = fakeClient([
      { filename: "src/login.pen", status: "modified", additions: 1, deletions: 0, changes: 1 },
    ]);
    const pr = await createPrSource("pr-1", "owner", "repo", 1, client);
    expect(await pr.readFile("src/login.pen")).toBe("content of src/login.pen");
  });
});
