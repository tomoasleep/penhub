import { createRequire } from "node:module";
import type { Source } from "./types";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

export interface SourceStore {
  save(source: Source): void;
  list(): Source[];
  remove(id: string): void;
}

export function createSourceStore(dbPath: string): SourceStore {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT,
      branch TEXT,
      owner TEXT,
      repo TEXT,
      pull_number INTEGER
    );
  `);

  function toSource(row: Record<string, unknown>): Source {
    return {
      id: row.id as string,
      type: row.type as Source["type"],
      name: row.name as string,
      path: (row.path as string | null) ?? undefined,
      branch: (row.branch as string | null) ?? undefined,
      owner: (row.owner as string | null) ?? undefined,
      repo: (row.repo as string | null) ?? undefined,
      pullNumber: (row.pull_number as number | null) ?? undefined,
    };
  }

  return {
    save(source: Source): void {
      db.prepare(
        `INSERT INTO sources (id, type, name, path, branch, owner, repo, pull_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           type = excluded.type,
           name = excluded.name,
           path = excluded.path,
           branch = excluded.branch,
           owner = excluded.owner,
           repo = excluded.repo,
           pull_number = excluded.pull_number`
      ).run(
        source.id,
        source.type,
        source.name,
        source.path ?? null,
        source.branch ?? null,
        source.owner ?? null,
        source.repo ?? null,
        source.pullNumber ?? null
      );
    },
    list(): Source[] {
      const rows = db.prepare(`SELECT * FROM sources ORDER BY name ASC`).all();
      return (rows as Record<string, unknown>[]).map(toSource);
    },
    remove(id: string): void {
      db.prepare(`DELETE FROM sources WHERE id = ?`).run(id);
    },
  };
}
