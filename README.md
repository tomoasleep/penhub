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

## GitHub の設定

Pull Request をソースとして追加するには、GitHub API を呼ぶための **Personal Access Token** が必要です。

### 1. Token を発行する

1. GitHub の [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) を開く
2. **Fine-grained tokens** を選択し **Generate new token** をクリック
3. リポジトリのアクセスを選択し、追加したい PR が含まれるリポジトリを許可
4. **Repository permissions** で以下を付与:
   - **Contents**: Read-only (PR のファイル内容を取得)
   - **Pull requests**: Read and write (レビューコメントの読み書き)
5. 生成された token をコピー

### 2. 環境変数に設定する

```sh
# シェルで直接指定する場合
GITHUB_TOKEN=ghp_xxx bun run dev:server

# .env ファイルを使う場合
echo "GITHUB_TOKEN=ghp_xxx" > .env
```

`.env` は `.gitignore` に含まれているため、コミットされません。

### 3. 動作確認

バックエンドを起動した状態で、ブラウザのソース選択から「＋ ソースを追加」を選び、PR の URL を入力すると追加できます。

```
https://github.com/owner/repo/pull/12
```

> **Note**: token 未設定のまま PR を追加しようとするとエラーになります。ローカルフォルダのみ使う場合は token は不要です。

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
