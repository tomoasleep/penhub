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
        {activeSource?.type === "pr" && activeSource.owner && activeSource.repo && activeSource.pullNumber != null && (
          <a
            className="pr-link-btn"
            href={`https://github.com/${activeSource.owner}/${activeSource.repo}/pull/${activeSource.pullNumber}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            GitHub PR を開く
            <svg className="ext-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
            </svg>
          </a>
        )}
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
