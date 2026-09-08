import { createFolderSource, type FolderSource } from "./folder-source";
import { createPrSource, type PrSource } from "./pr-source";
import { createSourceStore, type SourceStore } from "./source-store";
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
  listFiles(id: string): Promise<FileNode[]>;
  readFile(id: string, path: string): Promise<string>;
}

export function createSourceRegistry(options?: {
  store?: SourceStore;
  githubClient?: GithubClient;
}): SourceRegistry {
  const sources = new Map<string, FolderSource | PrSource>();
  const store: SourceStore = options?.store ?? createSourceStore(":memory:");
  const github: GithubClient | undefined = options?.githubClient;

  for (const saved of store.list()) {
    if (saved.type === "pr") {
      sources.set(saved.id, {
        source: saved,
        listFiles: () => [],
        readFile: async () => {
          throw new Error(`Source not loaded: ${saved.id}`);
        },
      });
    }
  }

  async function ensurePrLoaded(id: string): Promise<PrSource> {
    const existing = sources.get(id);
    if (existing && existing.source.type === "pr") {
      if ("listFiles" in existing && existing.listFiles().length > 0) {
        return existing as PrSource;
      }
    }
    if (!github) throw new Error(`Source not loaded: ${id}`);
    const saved = store.list().find((s) => s.id === id);
    if (!saved || saved.type !== "pr" || !saved.owner || !saved.repo || !saved.pullNumber) {
      throw new Error(`Unknown source: ${id}`);
    }
    const pr = await createPrSource(id, saved.owner, saved.repo, saved.pullNumber, github);
    sources.set(id, pr);
    return pr;
  }

  return {
    registerFolder(id: string, path: string): Source {
      const folder = createFolderSource(id, path);
      sources.set(id, folder);
      return folder.source;
    },
    async registerPr(id, owner, repo, pullNumber, client): Promise<Source> {
      const pr = await createPrSource(id, owner, repo, pullNumber, client);
      sources.set(id, pr);
      store.save(pr.source);
      return pr.source;
    },
    list(): Source[] {
      return [...sources.values()].map((s) => s.source);
    },
    async listFiles(id: string): Promise<FileNode[]> {
      const source = sources.get(id);
      if (!source) throw new Error(`Unknown source: ${id}`);
      if (source.source.type === "pr") {
        const pr = await ensurePrLoaded(id);
        return pr.listFiles();
      }
      return source.listFiles();
    },
    async readFile(id: string, path: string): Promise<string> {
      const source = sources.get(id);
      if (!source) throw new Error(`Unknown source: ${id}`);
      if (source.source.type === "pr") {
        const pr = await ensurePrLoaded(id);
        return pr.readFile(path);
      }
      return source.readFile(path);
    },
  };
}
