import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";

describe("penhub API", () => {
  let dir: string;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "penhub-api-"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "login.pen"), '{"version":"1"}');
    app = createApp();
    app.registerFolder("folder-1", dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("GET /api/sources returns registered sources", async () => {
    const res = await app.fetch("/api/sources");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: "folder-1", type: "folder" });
  });

  it("GET /api/sources/:id/files returns the file tree", async () => {
    const res = await app.fetch("/api/sources/folder-1/files");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      {
        name: "src",
        path: "src",
        type: "dir",
        children: [{ name: "login.pen", path: "src/login.pen", type: "file" }],
      },
    ]);
  });

  it("GET /api/sources/:id/files/:path returns file content", async () => {
    const res = await app.fetch("/api/sources/folder-1/files/src/login.pen");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ content: '{"version":"1"}' });
  });

  it("returns 404 for an unknown source", async () => {
    const res = await app.fetch("/api/sources/nope/files");
    expect(res.status).toBe(404);
  });

  it("returns 404 for a missing file", async () => {
    const res = await app.fetch("/api/sources/folder-1/files/missing.pen");
    expect(res.status).toBe(404);
  });

  it("POST /api/sources/:id/comments adds a comment", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/sources/folder-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: "src/login.pen",
          commitId: "abc123",
          nodeId: "0:5",
          body: "コントラストが低い",
          author: "tomoasleep",
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      filePath: "src/login.pen",
      nodeId: "0:5",
      body: "コントラストが低い",
    });
  });

  it("GET /api/sources/:id/comments lists comments for a file", async () => {
    await app.fetch(
      new Request("http://localhost/api/sources/folder-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: "src/login.pen",
          commitId: "abc123",
          nodeId: "0:5",
          body: "コメント1",
          author: "a",
        }),
      })
    );
    await app.fetch(
      new Request("http://localhost/api/sources/folder-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: "src/login.pen",
          commitId: "abc123",
          nodeId: "0:3",
          body: "コメント2",
          author: "b",
        }),
      })
    );

    const res = await app.fetch(
      "/api/sources/folder-1/comments?filePath=src/login.pen&nodeId=0:5"
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].body).toBe("コメント1");
  });
});
