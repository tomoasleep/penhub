import type { GithubClient, PrFile } from "./github-client";
import type { FileNode, Source } from "./types";

export interface PrSource {
  source: Source;
  listFiles(): FileNode[];
  readFile(path: string): Promise<string>;
}

export async function createPrSource(
  id: string,
  owner: string,
  repo: string,
  pullNumber: number,
  client: GithubClient
): Promise<PrSource> {
  const pr = await client.getPr(owner, repo, pullNumber);
  const files = await client.listPrFiles(owner, repo, pullNumber);
  const source: Source = {
    id,
    type: "pr",
    name: `#${pullNumber} ${pr.title}`,
    owner,
    repo,
    pullNumber,
    branch: pr.head.ref,
  };

  function buildTree(prFiles: PrFile[]): FileNode[] {
    const root: FileNode[] = [];
    for (const f of prFiles) {
      const parts = f.filename.split("/");
      let level = root;
      let path = "";
      for (let i = 0; i < parts.length; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        const isLast = i === parts.length - 1;
        if (isLast) {
          level.push({ name: parts[i], path, type: "file" });
        } else {
          let dir = level.find((n) => n.type === "dir" && n.name === parts[i]);
          if (!dir) {
            dir = { name: parts[i], path, type: "dir", children: [] };
            level.push(dir);
          }
          level = dir.children!;
        }
      }
    }
    return root;
  }

  return {
    source,
    listFiles() {
      return buildTree(files);
    },
    async readFile(path: string) {
      return client.getFileContent(owner, repo, path, pr.head.sha);
    },
  };
}