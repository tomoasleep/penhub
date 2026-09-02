import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { FileNode, Source } from "./types";

export interface FolderSource {
  source: Source;
  listFiles(): FileNode[];
  readFile(path: string): string;
}

export function createFolderSource(id: string, root: string): FolderSource {
  const source: Source = { id, type: "folder", name: root, path: root };

  function buildTree(dir: string, base: string): FileNode[] {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
      const aIsDir = a.isDirectory();
      const bIsDir = b.isDirectory();
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return entries.map((entry) => {
      const abs = join(dir, entry.name);
      const rel = base ? join(base, entry.name) : entry.name;
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: rel,
          type: "dir",
          children: buildTree(abs, rel),
        };
      }
      return { name: entry.name, path: rel, type: "file" };
    });
  }

  return {
    source,
    listFiles() {
      return buildTree(root, "");
    },
    readFile(path: string) {
      const abs = join(root, path);
      if (!statSync(abs).isFile()) {
        throw new Error(`Not a file: ${path}`);
      }
      return readFileSync(abs, "utf-8");
    },
  };
}
