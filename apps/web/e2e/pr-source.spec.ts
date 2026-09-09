import { expect, test } from "@playwright/test";

test("PR URL からソースを追加するとファイル一覧が表示される", async ({ page }) => {
  await page.goto("/");
  await page.selectOption(".source-select", "__add__");

  await page.locator(".modal-input").fill("https://github.com/admin/repo/pull/1");
  await page.getByRole("button", { name: "追加", exact: true }).click();

  await expect(page.locator(".source-select")).toHaveValue("pr-admin-repo-1");
  await expect(page.locator(".filetree .tree-item", { hasText: "login.pen" })).toBeVisible();
});

test("追加した PR ソースのファイルを選択すると内容が表示される", async ({ page }) => {
  await page.goto("/");
  await page.selectOption(".source-select", "__add__");

  await page.locator(".modal-input").fill("https://github.com/admin/repo/pull/1");
  await page.getByRole("button", { name: "追加", exact: true }).click();

  await page.locator(".filetree .tree-item", { hasText: "login.pen" }).click();
  await expect(page.locator(".viewer .path")).toHaveText("src/login.pen");
  await expect(page.locator(".canvas")).toBeVisible();
});

test("PR ソース選択時に GitHub PR を開くリンクが表示される", async ({ page }) => {
  await page.goto("/");
  await page.selectOption(".source-select", "__add__");

  await page.locator(".modal-input").fill("https://github.com/admin/repo/pull/1");
  await page.getByRole("button", { name: "追加", exact: true }).click();

  const link = page.locator(".topbar .pr-link-btn");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://github.com/admin/repo/pull/1");
  await expect(link).toHaveAttribute("target", "_blank");
});

test("PR ソース以外では GitHub PR を開くリンクを表示しない", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".topbar .pr-link-btn")).toHaveCount(0);

  await page.selectOption(".source-select", "demo");
  await expect(page.locator(".topbar .pr-link-btn")).toHaveCount(0);
});
