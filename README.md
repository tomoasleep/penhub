# penhub

pen.dev の `.pen` フォーマットファイルを、GitHub 的に確認・レビューできる Web アプリ。

- ローカルフォルダ / Git リポジトリ / GitHub Pull Request のファイル一覧を GitHub 風 UI で表示
- `.pen` ファイルをブラウザ上で描画 (open-pencil のライブラリを利用、Vue は不使用)
- node に紐づくコメントを残せる。コメントは commit id / node id を保持し、GitHub コメントと相互 sync

## 技術スタック

| レイヤ | 技術 |
|---|---|
| フロント | React 19 + Vite + TypeScript |
| バック | Node + Hono + TypeScript |
| .pen パース | `@open-pencil/pen` (`parsePenFile`) |
| レンダリング | `@open-pencil/core` (`SkiaRenderer` + CanvasKit WASM) |
| ヒットテスト | `@open-pencil/scene-graph` (`hitTest`) |
| GitHub API | `octokit` |
| ローカル DB | `node:sqlite` |

## 構成

```
apps/
  server/   Node + Hono バックエンド (REST API)
  web/      React フロントエンド (.pen Viewer)
```

## セットアップ

```sh
bun install
```

## 開発

```sh
# バックエンド (ポート 8787)
PENHUB_DEMO_DIR=/path/to/demo bun run dev:server

# フロントエンド (ポート 5173)
bun run dev:web
```

`PENHUB_DEMO_DIR` を指定すると、そのフォルダがソースとして登録される。

## テスト

```sh
bun run test         # vitest 単体テスト (バックエンド)
bun run typecheck    # tsc
```

GitHub 連携のテストは `vercel-labs/emulate` の GitHub エミュレータで検証する (実ネットワーク不要)。

## コメントと GitHub sync

コメントは node に紐づき、`commitId` と `nodeId` を保持する。

- **ローカルフォルダ**: SQLite に永続化
- **GitHub PR**: review comment (コード行コメント) として投稿。本文に HTML コメントマーカーを埋め込む

```
<!-- penhub:node=0:3:commit=abc123 -->
このボタンの色がアクセシビリティ的に問題あり
```

penhub は GitHub コメントを読み、マーカーをパースして node に紐づける。これにより GitHub 上でもコメントが読め、penhub と相互 sync できる。
