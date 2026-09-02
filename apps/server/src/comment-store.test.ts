import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCommentStore } from "./comment-store";

describe("createCommentStore", () => {
  let dir: string;
  let store: ReturnType<typeof createCommentStore>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "penhub-comments-"));
    store = createCommentStore(join(dir, "comments.db"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("adds and lists comments", () => {
    store.add({
      source: "local",
      filePath: "src/login.pen",
      commitId: "abc123",
      nodeId: "0:5",
      body: "コントラストが低い",
      author: "tomoasleep",
    });

    const comments = store.list("src/login.pen");
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      filePath: "src/login.pen",
      nodeId: "0:5",
      body: "コントラストが低い",
      author: "tomoasleep",
    });
    expect(comments[0].id).toBeTruthy();
    expect(comments[0].createdAt).toBeTruthy();
  });

  it("lists comments filtered by nodeId", () => {
    store.add({
      source: "local",
      filePath: "src/login.pen",
      commitId: "abc123",
      nodeId: "0:5",
      body: "node5 へのコメント",
      author: "a",
    });
    store.add({
      source: "local",
      filePath: "src/login.pen",
      commitId: "abc123",
      nodeId: "0:3",
      body: "node3 へのコメント",
      author: "b",
    });

    const node5 = store.list("src/login.pen", "0:5");
    expect(node5).toHaveLength(1);
    expect(node5[0].body).toBe("node5 へのコメント");
  });

  it("deletes a comment by id", () => {
    const added = store.add({
      source: "local",
      filePath: "src/login.pen",
      commitId: "abc123",
      nodeId: "0:5",
      body: "削除対象",
      author: "a",
    });

    store.remove(added.id);
    expect(store.list("src/login.pen")).toHaveLength(0);
  });
});
