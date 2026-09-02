export type SourceType = "folder" | "repo" | "pr";

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  path?: string;
  branch?: string;
  owner?: string;
  repo?: string;
  pullNumber?: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

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
