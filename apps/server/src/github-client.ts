import { Octokit } from "octokit";

export interface GithubClient {
  listPrFiles(owner: string, repo: string, pullNumber: number): Promise<unknown[]>;
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
}): GithubClient {
  const octokit = new Octokit({
    auth: options.token,
    baseUrl: options.baseUrl,
  });

  return {
    async listPrFiles(owner, repo, pullNumber) {
      const res = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return res.data;
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
