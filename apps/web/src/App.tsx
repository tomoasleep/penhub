import { useEffect, useState } from "react";
import type { FileNode, PenComment, Source } from "./types";
import { FileTree } from "./components/FileTree";
import { PenViewer } from "./components/PenViewer";
import { CommentPanel } from "./components/CommentPanel";

export function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [comments, setComments] = useState<PenComment[]>([]);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then(setSources);
  }, []);

  useEffect(() => {
    if (!activeSource) return;
    fetch(`/api/sources/${activeSource.id}/files`)
      .then((r) => r.json())
      .then(setFiles);
  }, [activeSource]);

  useEffect(() => {
    if (!activeSource || !activeFile) return;
    fetch(`/api/sources/${activeSource.id}/files/${activeFile}`)
      .then((r) => r.json())
      .then((body) => setContent(body.content));
  }, [activeSource, activeFile]);

  useEffect(() => {
    if (!activeSource || !activeFile) return;
    fetch(`/api/sources/${activeSource.id}/comments?filePath=${encodeURIComponent(activeFile)}`)
      .then((r) => r.json())
      .then(setComments);
  }, [activeSource, activeFile]);

  async function addComment(body: string) {
    if (!activeSource || !activeFile || !selectedNodeId) return;
    const res = await fetch(`/api/sources/${activeSource.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath: activeFile,
        commitId: "",
        nodeId: selectedNodeId,
        body,
        author: "tomoasleep",
      }),
    });
    if (res.ok) {
      const added = await res.json();
      setComments((prev) => [...prev, added]);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          pen<span>hub</span>
        </div>
        <select
          className="source-select"
          value={activeSource?.id ?? ""}
          onChange={(e) => {
            const s = sources.find((x) => x.id === e.target.value);
            setActiveSource(s ?? null);
            setActiveFile(null);
            setSelectedNodeId(null);
          }}
        >
          <option value="">ソースを選択</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </header>
      <div className="layout">
        <aside className="filetree">
          <FileTree
            nodes={files}
            activePath={activeFile}
            onSelect={(path) => {
              setActiveFile(path);
              setSelectedNodeId(null);
            }}
          />
        </aside>
        <main className="main">
          {activeFile && content ? (
            <PenViewer
              filePath={activeFile}
              content={content}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          ) : (
            <div className="empty-state">
              <div className="icon">🖼️</div>
              <div className="title">ファイルを選択してください</div>
              <div className="desc">左のツリーから .pen ファイルを選ぶと表示されます</div>
            </div>
          )}
        </main>
        <aside className="comments">
          <CommentPanel
            comments={comments}
            selectedNodeId={selectedNodeId}
            onAdd={addComment}
          />
        </aside>
      </div>
    </div>
  );
}
