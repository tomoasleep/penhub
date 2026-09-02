import { createFolderSource, type FolderSource } from "./folder-source";
import type { FileNode, Source } from "./types";

export interface SourceRegistry {
  registerFolder(id: string, path: string): Source;
  list(): Source[];
  listFiles(id: string): FileNode[];
  readFile(id: string, path: string): string;
}

export function createSourceRegistry(): SourceRegistry {
  const sources = new Map<string, FolderSource>();

  return {
    registerFolder(id: string, path: string): Source {
      const folder = createFolderSource(id, path);
      sources.set(id, folder);
      return folder.source;
    },
    list(): Source[] {
      return [...sources.values()].map((s) => s.source);
    },
    listFiles(id: string): FileNode[] {
      const folder = sources.get(id);
      if (!folder) throw new Error(`Unknown source: ${id}`);
      return folder.listFiles();
    },
    readFile(id: string, path: string): string {
      const folder = sources.get(id);
      if (!folder) throw new Error(`Unknown source: ${id}`);
      return folder.readFile(path);
    },
  };
}
