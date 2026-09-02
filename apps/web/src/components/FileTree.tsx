import { useState } from "react";
import type { FileNode } from "../types";

interface Props {
  nodes: FileNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
}

function TreeItem({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "dir";

  return (
    <>
      <div
        className={`tree-item indent-${depth} ${activePath === node.path ? "active" : ""}`}
        onClick={() => {
          if (isDir) {
            setOpen((o) => !o);
          } else {
            onSelect(node.path);
          }
        }}
      >
        <span className="icon">{isDir ? (open ? "▾" : "▸") : node.name.endsWith(".pen") ? "🖼️" : "📄"}</span>
        <span className="name">{node.name}</span>
        {node.name.endsWith(".pen") && <span className="pen-badge">pen</span>}
      </div>
      {isDir && open && node.children?.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function FileTree({ nodes, activePath, onSelect }: Props) {
  return (
    <div className="tree-header">
      <div className="tree-header-label">ファイル</div>
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
