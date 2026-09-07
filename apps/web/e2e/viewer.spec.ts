import { expect, test } from "@playwright/test";
import { initCanvasKit } from "@open-pencil/core/io/formats/raster";
import type { CanvasKit } from "canvaskit-wasm";
import {
  countNearColor,
  decodePng,
  hexToRgb,
} from "../test/lib/pixels";

const DARK = hexToRgb("#111827");
const ACCENT = hexToRgb("#3B82F6");

let ck: CanvasKit;

test.beforeAll(async () => {
  ck = await initCanvasKit();
});

async function openDemoFile(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.selectOption(".source-select", "demo");
  await page.getByText("penhub-demo.pen").click();
  await expect(page.locator(".canvas")).toBeVisible();
}

async function canvasColoredPixelCount(page: import("@playwright/test").Page): Promise<number> {
  const dataUrl = await page.locator(".canvas").evaluate((el) =>
    (el as HTMLCanvasElement).toDataURL("image/png"),
  );
  const png = Buffer.from(dataUrl.split(",")[1]!, "base64");
  const img = decodePng(ck, new Uint8Array(png));
  return countNearColor(img, DARK, 20) + countNearColor(img, ACCENT, 20);
}

async function openDemoFileAndAwaitRender(page: import("@playwright/test").Page) {
  await openDemoFile(page);
  await expect.poll(() => canvasColoredPixelCount(page)).toBeGreaterThan(1000);
}

test("ソースと .pen ファイルを選択するとビューアが開く", async ({ page }) => {
  await openDemoFile(page);
  await expect(page.locator(".viewer .path")).toHaveText("penhub-demo.pen");
  await expect(page.locator(".filetree .tree-item", { hasText: "penhub-demo.pen" })).toBeVisible();
});

test("canvas に UI とテキストが描画される", async ({ page }) => {
  await openDemoFile(page);

  await expect.poll(() => canvasColoredPixelCount(page)).toBeGreaterThan(5000);
});

test("canvas をクリックすると node が選択されコメント入力が有効になる", async ({ page }) => {
  await openDemoFileAndAwaitRender(page);
  await expect(page.locator(".comment-input textarea")).toBeDisabled();
  await expect(page.locator(".comment-input .node-tag")).toHaveText("未選択");

  await page.locator(".canvas").click();

  await expect(page.locator(".comment-input textarea")).toBeEnabled();
  await expect(page.locator(".comment-input .node-tag")).not.toHaveText("未選択");
});

test("canvas をクリックすると inspector に node の属性が表示される", async ({ page }) => {
  await openDemoFileAndAwaitRender(page);
  await expect(page.locator(".inspector-empty")).toBeVisible();

  await page.locator(".canvas").click();

  await expect(page.locator(".inspector .inspector-header .node-name")).not.toBeEmpty();
  await expect(page.locator(".inspector .node-type")).not.toBeEmpty();
  await expect(page.locator(".inspector .section-title", { hasText: "Position" })).toBeVisible();
  await expect(page.locator(".inspector .section-title", { hasText: "Dimensions" })).toBeVisible();
  await expect(page.locator(".inspector .section-title", { hasText: "Appearance" })).toBeVisible();

  const field = page.locator(".inspector .field", { hasText: "Opacity" });
  await expect(field.locator(".value")).toHaveText(/\d+%$/);
});

test("選択した node にコメントを投稿でき、リロード後も表示される", async ({ page }) => {
  await openDemoFileAndAwaitRender(page);
  await page.locator(".canvas").click();
  await expect(page.locator(".comment-input textarea")).toBeEnabled();

  const body = `E2E コメント ${Date.now()}`;
  await page.locator(".comment-input textarea").fill(body);
  await page.getByRole("button", { name: "コメント", exact: true }).click();
  await expect(
    page.locator(".comments-list .comment .body", { hasText: body }),
  ).toBeVisible();

  await page.reload();
  await page.selectOption(".source-select", "demo");
  await page.getByText("penhub-demo.pen").click();
  await expect(page.locator(".canvas")).toBeVisible();
  await expect(
    page.locator(".comments-list .comment .body", { hasText: body }),
  ).toBeVisible();
});

test("ファイル一覧サイドバーを折りたたみ・展開できる", async ({ page }) => {
  await openDemoFile(page);
  await expect(page.locator(".filetree .tree-item", { hasText: "penhub-demo.pen" })).toBeVisible();

  await page.getByRole("button", { name: "ファイル一覧を折りたたむ" }).click();
  await expect(page.locator(".filetree")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "ファイル一覧を展開" })).toBeVisible();

  await page.getByRole("button", { name: "ファイル一覧を展開" }).click();
  await expect(page.locator(".filetree .tree-item", { hasText: "penhub-demo.pen" })).toBeVisible();
});

test("コメントサイドバーを折りたたみ・展開できる", async ({ page }) => {
  await openDemoFile(page);
  await expect(page.locator(".comments")).toBeVisible();

  await page.getByRole("button", { name: "コメントを折りたたむ" }).click();
  await expect(page.locator(".comments")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "コメントを展開" })).toBeVisible();

  await page.getByRole("button", { name: "コメントを展開" }).click();
  await expect(page.locator(".comments")).toBeVisible();
});

test("files API がエラーを返してもアプリがクラッシュしない", async ({ page }) => {
  await page.route("**/api/sources/demo/files", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "boom" }),
    }),
  );

  await page.goto("/");
  await page.selectOption(".source-select", "demo");

  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.locator(".main .empty-state")).toBeVisible();
  await expect(page.locator(".filetree .tree-item")).toHaveCount(0);
});

test("sources API がエラーを返してもアプリがクラッシュしない", async ({ page }) => {
  await page.route("**/api/sources", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "boom" }),
    }),
  );

  await page.goto("/");

  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.locator(".source-select")).toBeVisible();
  await expect(page.locator(".main .empty-state")).toBeVisible();
});
