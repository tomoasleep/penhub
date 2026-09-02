import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

export interface PenComment {
  id: string;
  source: "github" | "local";
  filePath: string;
  commitId: string;
  nodeId: string;
  line?: number;
  body: string;
  author: string;
  createdAt: string;
  githubUrl?: string;
}

export interface NewComment {
  source: "github" | "local";
  filePath: string;
  commitId: string;
  nodeId: string;
  line?: number;
  body: string;
  author: string;
  githubUrl?: string;
}

export interface CommentStore {
  add(comment: NewComment): PenComment;
  get(id: string): PenComment | null;
  list(filePath: string, nodeId?: string): PenComment[];
  remove(id: string): void;
}

export function createCommentStore(dbPath: string): CommentStore {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      file_path TEXT NOT NULL,
      commit_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      line INTEGER,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL,
      github_url TEXT
    );
  `);

  return {
    add(comment: NewComment): PenComment {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO comments (id, source, file_path, commit_id, node_id, line, body, author, created_at, github_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        comment.source,
        comment.filePath,
        comment.commitId,
        comment.nodeId,
        comment.line ?? null,
        comment.body,
        comment.author,
        createdAt,
        comment.githubUrl ?? null
      );
      return { id, createdAt, ...comment };
    },
    get(id: string): PenComment | null {
      const row = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id);
      if (!row) return null;
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        source: r.source as "github" | "local",
        filePath: r.file_path as string,
        commitId: r.commit_id as string,
        nodeId: r.node_id as string,
        line: r.line as number | undefined,
        body: r.body as string,
        author: r.author as string,
        createdAt: r.created_at as string,
        githubUrl: r.github_url as string | undefined,
      };
    },
    list(filePath: string, nodeId?: string): PenComment[] {
      const rows = nodeId
        ? db
            .prepare(
              `SELECT * FROM comments WHERE file_path = ? AND node_id = ? ORDER BY created_at ASC`
            )
            .all(filePath, nodeId)
        : db
            .prepare(
              `SELECT * FROM comments WHERE file_path = ? ORDER BY created_at ASC`
            )
            .all(filePath);
      return (rows as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        source: r.source as "github" | "local",
        filePath: r.file_path as string,
        commitId: r.commit_id as string,
        nodeId: r.node_id as string,
        line: r.line as number | undefined,
        body: r.body as string,
        author: r.author as string,
        createdAt: r.created_at as string,
        githubUrl: r.github_url as string | undefined,
      }));
    },
    remove(id: string): void {
      db.prepare(`DELETE FROM comments WHERE id = ?`).run(id);
    },
  };
}
