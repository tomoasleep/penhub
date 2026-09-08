import { Octokit } from "octokit";

export interface PrFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PrInfo {
  number: number;
  title: string;
  head: { ref: string; sha: string };
  base: { ref: string };
}

export interface GithubClient {
  getPr(owner: string, repo: string, pullNumber: number): Promise<PrInfo>;
  listPrFiles(owner: string, repo: string, pullNumber: number): Promise<PrFile[]>;
  getFileContent(owner: string, repo: string, path: string, ref: string): Promise<string>;
  createReviewComment(args: {
    owner: string;
    repo: string;
    pullNumber: number;
    commitId: string;
    path: string;
    line: number;
    body: string;
  }): Promise<{ id: number }>;
  listReviewComments(owner: string, repo: string, pullNumber: number): Promise<unknown[]>;
}

export function createGithubClient(options: {
  baseUrl?: string;
  token: string;
  cacheTtlMs?: number;
}): GithubClient {
  const octokit = new Octokit({
    auth: options.token,
    baseUrl: options.baseUrl,
  });

  const cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
  const contentCache = new Map<string, { value: string; expiresAt: number }>();

  function cacheKey(owner: string, repo: string, path: string, ref: string): string {
    return `${owner}/${repo}/${path}@${ref}`;
  }

  function getCached(key: string): string | null {
    const entry = contentCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      contentCache.delete(key);
      return null;
    }
    return entry.value;
  }

  function setCached(key: string, value: string): void {
    contentCache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
  }

  return {
    async getPr(owner, repo, pullNumber) {
      const res = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return {
        number: res.data.number,
        title: res.data.title,
        head: { ref: res.data.head.ref, sha: res.data.head.sha },
        base: { ref: res.data.base.ref },
      };
    },
    async listPrFiles(owner, repo, pullNumber) {
      const res = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return res.data.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
      }));
    },
    async getFileContent(owner, repo, path, ref) {
      const key = cacheKey(owner, repo, path, ref);
      const cached = getCached(key);
      if (cached !== null) return cached;

      const res = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      if (Array.isArray(res.data) || !("content" in res.data)) {
        throw new Error(`Not a file: ${path}`);
      }
      const content = Buffer.from(res.data.content, "base64").toString("utf-8");
      setCached(key, content);
      return content;
    },
    async createReviewComment({ owner, repo, pullNumber, commitId, path, line, body }) {
      const res = await octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: pullNumber,
        commit_id: commitId,
        path,
        line,
        body,
      });
      return { id: res.data.id };
    },
    async listReviewComments(owner, repo, pullNumber) {
      const res = await octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return res.data;
    },
  };
}
