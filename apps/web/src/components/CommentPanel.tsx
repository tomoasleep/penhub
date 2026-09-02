import { useState } from "react";
import type { PenComment } from "../types";

interface Props {
  comments: PenComment[];
  selectedNodeId: string | null;
  onAdd: (body: string) => void;
}

export function CommentPanel({ comments, selectedNodeId, onAdd }: Props) {
  const [body, setBody] = useState("");

  const filtered = selectedNodeId
    ? comments.filter((c) => c.nodeId === selectedNodeId)
    : comments;

  function submit() {
    if (!body.trim()) return;
    onAdd(body.trim());
    setBody("");
  }

  return (
    <div className="comments-panel">
      <div className="comments-header">
        <span>コメント</span>
        <span className="count">{filtered.length} 件</span>
      </div>
      <div className="comments-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💬</div>
            <div className="title">コメントはありません</div>
            <div className="desc">
              {selectedNodeId
                ? "この node にコメントを残せます"
                : "Viewer で node をクリックしてコメントを残せます"}
            </div>
          </div>
        ) : (
          filtered.map((c) => (
            <div className="comment" key={c.id}>
              <div className="meta">
                <div className="avatar">{c.author.charAt(0).toUpperCase()}</div>
                <span className="author">{c.author}</span>
                <span className="time">{new Date(c.createdAt).toLocaleString()}</span>
                <span className="node-tag">{c.nodeId}</span>
              </div>
              <div className="body">{c.body}</div>
            </div>
          ))
        )}
      </div>
      <div className="comment-input">
        <div className="node-info">
          <span>コメント先:</span>
          <span className="node-tag">{selectedNodeId ?? "未選択"}</span>
        </div>
        <textarea
          placeholder={
            selectedNodeId
              ? "この node にコメントを残す…"
              : "Viewer で node を選択してください"
          }
          value={body}
          disabled={!selectedNodeId}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="input-actions">
          <span className="hint">ローカルに保存されます</span>
          <button className="btn" disabled={!selectedNodeId || !body.trim()} onClick={submit}>
            コメント
          </button>
        </div>
      </div>
    </div>
  );
}
