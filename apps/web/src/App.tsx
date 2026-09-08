import { useEffect, useState } from "react";
import type { SceneNode } from "@open-pencil/scene-graph";
import type { FileNode, PenComment, Source } from "./types";
import { FileTree } from "./components/FileTree";
import { PenViewer } from "./components/PenViewer";
import { CommentPanel } from "./components/CommentPanel";
import { NodeInspector } from "./components/NodeInspector";

export function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SceneNode | null>(null);
  const [comments, setComments] = useState<PenComment[]>([]);
  const [filetreeOpen, setFiletreeOpen] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [prError, setPrError] = useState<string | null>(null);
  const [prLoading, setPrLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => (r.ok ? r.json() : []))
      .then((body) => setSources(Array.isArray(body) ? body : []));
  }, []);

  function parsePrUrl(url: string): { owner: string; repo: string; pullNumber: number } | null {
    const m = url.trim().match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2], pullNumber: Number(m[3]) };
  }

  async function addPrSource() {
    const parsed = parsePrUrl(prUrl);
    if (!parsed) {
      setPrError("GitHub の PR URL を入力してください");
      return;
    }
    setPrError(null);
    setPrLoading(true);
    const res = await fetch("/api/sources/pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setPrLoading(false);
    if (!res.ok) {
      setPrError("PR を読み込めませんでした");
      return;
    }
    const added = await res.json();
    setSources((prev) => [...prev, added]);
    setActiveSource(added);
    setActiveFile(null);
    setSelectedNodeId(null);
    setPrModalOpen(false);
    setPrUrl("");
  }

  useEffect(() => {
    if (!activeSource) return;
    fetch(`/api/sources/${activeSource.id}/files`)
      .then((r) => (r.ok ? r.json() : []))
      .then((body) => setFiles(Array.isArray(body) ? body : []));
  }, [activeSource]);

  useEffect(() => {
    if (!activeSource || !activeFile) return;
    fetch(`/api/sources/${activeSource.id}/files/${activeFile}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setContent(body?.content ?? null));
  }, [activeSource, activeFile]);

  useEffect(() => {
    if (!activeSource || !activeFile) return;
    fetch(`/api/sources/${activeSource.id}/comments?filePath=${encodeURIComponent(activeFile)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((body) => setComments(Array.isArray(body) ? body : []));
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
            if (e.target.value === "__add__") {
              setPrModalOpen(true);
              e.target.value = activeSource?.id ?? "";
              return;
            }
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
          <option value="__add__">＋ ソースを追加</option>
        </select>
      </header>
      {prModalOpen && (
        <div className="modal-overlay" onClick={() => setPrModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">ソースを追加</div>
              <button
                type="button"
                className="icon-btn"
                aria-label="閉じる"
                title="閉じる"
                onClick={() => setPrModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-desc">
                GitHub の Pull Request の URL を入力してソースとして追加します。
              </div>
              <label className="modal-field">
                <span className="modal-label">PR URL</span>
                <input
                  className="modal-input"
                  placeholder="https://github.com/owner/repo/pull/12"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  autoFocus
                />
              </label>
              {prError && <div className="modal-error">{prError}</div>}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="modal-cancel"
                onClick={() => setPrModalOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="modal-submit"
                onClick={addPrSource}
                disabled={!prUrl.trim() || prLoading}
              >
                {prLoading ? "読み込み中…" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`layout ${filetreeOpen ? "" : "filetree-collapsed"} ${commentsOpen ? "" : "comments-collapsed"}`}
      >
        {!filetreeOpen && (
          <div className="rail rail-left">
            <button
              type="button"
              className="icon-btn"
              aria-label="ファイル一覧を展開"
              title="ファイル一覧を展開"
              onClick={() => setFiletreeOpen(true)}
            >
              ☰
            </button>
          </div>
        )}
        {filetreeOpen && (
          <aside className="filetree">
            <FileTree
              nodes={files}
              activePath={activeFile}
              onSelect={(path) => {
                setActiveFile(path);
                setSelectedNodeId(null);
              }}
              onCollapse={() => setFiletreeOpen(false)}
            />
          </aside>
        )}
        <main className="main">
          {activeSource && activeFile && content ? (
            <PenViewer
              sourceId={activeSource.id}
              filePath={activeFile}
              content={content}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onSelectedNodeChange={setSelectedNode}
            />
          ) : (
            <div className="empty-state">
              <div className="icon">🖼️</div>
              <div className="title">ファイルを選択してください</div>
              <div className="desc">左のツリーから .pen ファイルを選ぶと表示されます</div>
            </div>
          )}
        </main>
        {commentsOpen && (
          <aside className="comments">
            <NodeInspector node={selectedNode} />
            <CommentPanel
              comments={comments}
              selectedNodeId={selectedNodeId}
              onAdd={addComment}
              onCollapse={() => setCommentsOpen(false)}
            />
          </aside>
        )}
        {!commentsOpen && (
          <div className="rail rail-right">
            <button
              type="button"
              className="icon-btn"
              aria-label="コメントを展開"
              title="コメントを展開"
              onClick={() => setCommentsOpen(true)}
            >
              ☰
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
