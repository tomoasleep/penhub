import type { GithubClient } from "./github-client";
import type { CommentStore, PenComment } from "./comment-store";
import { encodeMarker, extractMarker } from "./github-marker";

export interface GithubSync {
  syncFromGithub(args: {
    owner: string;
    repo: string;
    pullNumber: number;
    filePath: string;
  }): Promise<void>;
  syncToGithub(args: {
    owner: string;
    repo: string;
    pullNumber: number;
    commentId: string;
  }): Promise<void>;
  addComment(comment: {
    filePath: string;
    commitId: string;
    nodeId: string;
    line?: number;
    body: string;
    author: string;
  }): PenComment;
  listComments(filePath: string): PenComment[];
}

export function createGithubSync(options: {
  client: GithubClient;
  store: CommentStore;
}): GithubSync {
  const { client, store } = options;

  return {
    async syncFromGithub({ owner, repo, pullNumber, filePath }) {
      const comments = await client.listReviewComments(owner, repo, pullNumber);
      for (const c of comments as Array<{
        id: number;
        path?: string;
        body: string;
        user?: { login?: string };
        created_at?: string;
        html_url?: string;
      }>) {
        if (c.path !== filePath) continue;
        const marker = extractMarker(c.body);
        if (!marker) continue;
        store.add({
          source: "github",
          filePath,
          commitId: marker.commitId,
          nodeId: marker.nodeId,
          body: marker.body,
          author: c.user?.login ?? "unknown",
          githubUrl: c.html_url,
        });
      }
    },
    async syncToGithub({ owner, repo, pullNumber, commentId }) {
      const comment = store.get(commentId);
      if (!comment) throw new Error(`Comment not found: ${commentId}`);
      const body = `${encodeMarker(comment.nodeId, comment.commitId)}\n${comment.body}`;
      await client.createReviewComment({
        owner,
        repo,
        pullNumber,
        commitId: comment.commitId,
        path: comment.filePath,
        line: comment.line ?? 1,
        body,
      });
    },
    addComment(comment) {
      return store.add({ ...comment, source: "local" });
    },
    listComments(filePath) {
      return store.list(filePath);
    },
  };
}
