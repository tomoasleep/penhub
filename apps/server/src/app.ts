import { Hono } from "hono";
import { createSourceRegistry, type SourceRegistry } from "./source-registry";
import { createCommentStore, type CommentStore } from "./comment-store";

export interface PenhubApp {
  fetch: (request: Request | string) => Promise<Response>;
  registerFolder: (id: string, path: string) => void;
}

export function createApp(options?: { commentStore?: CommentStore }): PenhubApp {
  const registry: SourceRegistry = createSourceRegistry();
  const comments: CommentStore =
    options?.commentStore ?? createCommentStore(":memory:");
  const app = new Hono();

  app.get("/api/sources", (c) => {
    return c.json(registry.list());
  });

  app.get("/api/sources/:id/files", (c) => {
    const id = c.req.param("id");
    try {
      return c.json(registry.listFiles(id));
    } catch {
      return c.json({ error: "Source not found" }, 404);
    }
  });

  app.get("/api/sources/:id/files/*", (c) => {
    const id = c.req.param("id");
    const path = c.req.path.replace(`/api/sources/${id}/files/`, "");
    try {
      return c.json({ content: registry.readFile(id, path) });
    } catch {
      return c.json({ error: "File not found" }, 404);
    }
  });

  app.get("/api/sources/:id/comments", (c) => {
    const filePath = c.req.query("filePath");
    const nodeId = c.req.query("nodeId");
    if (!filePath) return c.json({ error: "filePath is required" }, 400);
    return c.json(comments.list(filePath, nodeId));
  });

  app.post("/api/sources/:id/comments", async (c) => {
    const body = await c.req.json();
    if (!body.filePath || !body.nodeId || !body.body) {
      return c.json({ error: "filePath, nodeId, body are required" }, 400);
    }
    const comment = comments.add({
      source: "local",
      filePath: body.filePath,
      commitId: body.commitId ?? "",
      nodeId: body.nodeId,
      line: body.line,
      body: body.body,
      author: body.author ?? "anonymous",
    });
    return c.json(comment, 201);
  });

  return {
    fetch: async (request) => {
      const req =
        typeof request === "string"
          ? new Request(`http://localhost${request}`)
          : request;
      return app.fetch(req);
    },
    registerFolder: (id, path) => {
      registry.registerFolder(id, path);
    },
  };
}
