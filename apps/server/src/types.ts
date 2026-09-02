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
