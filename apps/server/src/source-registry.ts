import { createFolderSource, type FolderSource } from "./folder-source";
import { createPrSource, type PrSource } from "./pr-source";
import type { GithubClient } from "./github-client";
import type { FileNode, Source } from "./types";

export interface SourceRegistry {
  registerFolder(id: string, path: string): Source;
  registerPr(
    id: string,
    owner: string,
    repo: string,
    pullNumber: number,
    client: GithubClient
  ): Promise<Source>;
  list(): Source[];
  listFiles(id: string): FileNode[];
  readFile(id: string, path: string): Promise<string>;
}

export function createSourceRegistry(): SourceRegistry {
  const sources = new Map<string, FolderSource | PrSource>();

  return {
    registerFolder(id: string, path: string): Source {
      const folder = createFolderSource(id, path);
      sources.set(id, folder);
      return folder.source;
    },
    async registerPr(id, owner, repo, pullNumber, client): Promise<Source> {
      const pr = await createPrSource(id, owner, repo, pullNumber, client);
      sources.set(id, pr);
      return pr.source;
    },
    list(): Source[] {
      return [...sources.values()].map((s) => s.source);
    },
    listFiles(id: string): FileNode[] {
      const source = sources.get(id);
      if (!source) throw new Error(`Unknown source: ${id}`);
      return source.listFiles();
    },
    async readFile(id: string, path: string): Promise<string> {
      const source = sources.get(id);
      if (!source) throw new Error(`Unknown source: ${id}`);
      return source.readFile(path);
    },
  };
}
