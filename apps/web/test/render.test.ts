import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { parsePenFile } from "@open-pencil/pen";
import { headlessRenderNodes, initCanvasKit } from "@open-pencil/core/io/formats/raster";
import type { CanvasKit } from "canvaskit-wasm";
import type { SceneGraph } from "@open-pencil/scene-graph";
import {
  countLumaBelow,
  countNearColor,
  decodePng,
  findDarkBand,
  hexToRgb,
  nonBackgroundRatio,
} from "./lib/pixels";

const DEMO_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../demo/penhub-demo.pen");

const DARK = hexToRgb("#111827");
const ACCENT = hexToRgb("#3B82F6");

let ck: CanvasKit;
let graph: SceneGraph;
let pageId: string;
let loginFrameId: string;
let prReviewFrameId: string;

beforeAll(async () => {
  ck = await initCanvasKit();
  graph = parsePenFile(readFileSync(DEMO_PATH, "utf-8"));
  const page = graph.getPages(true)[0];
  pageId = page.id;
  const topNodes = Array.from(graph.getAllNodes()).filter((n) => n.parentId === pageId);
  loginFrameId = topNodes.find((n) => n.name === "Login Screen")!.id;
  prReviewFrameId = topNodes.find((n) => n.name === "PR Review")!.id;
});

async function renderFrame(nodeId: string) {
  const png = await headlessRenderNodes(graph, pageId, [nodeId], { scale: 1 });
  expect(png).not.toBeNull();
  return decodePng(ck, png!);
}

describe("demo/penhub-demo.pen のヘッドレス描画", () => {
  it("Login Screen が 480px 幅で描画され、ボタン・テキスト・アクセント色が含まれる", async () => {
    const img = await renderFrame(loginFrameId);
    expect(img.width).toBe(480);
    expect(img.height).toBeGreaterThan(400);

    expect(nonBackgroundRatio(img, hexToRgb("#FFFFFF"))).toBeGreaterThan(0.05);
    expect(countNearColor(img, DARK, 16)).toBeGreaterThan(5000);
    expect(countNearColor(img, ACCENT, 16)).toBeGreaterThan(200);
    expect(countNearColor(img, hexToRgb("#6B7280"), 16)).toBeGreaterThan(200);

    const band = findDarkBand(img, DARK);
    expect(band.rows.length).toBeGreaterThanOrEqual(40);
    expect(band.lightPixelsInBand).toBeGreaterThan(500);
  });

  it("PR Review が 1200x760 で描画され、ヘッダー・テキスト・アクセント色が含まれる", async () => {
    const img = await renderFrame(prReviewFrameId);
    expect(img.width).toBe(1200);
    expect(img.height).toBe(760);

    expect(countNearColor(img, DARK, 16)).toBeGreaterThan(10000);
    expect(countNearColor(img, ACCENT, 16)).toBeGreaterThan(2000);

    const band = findDarkBand(img, DARK);
    expect(band.rows.length).toBeGreaterThanOrEqual(30);
    expect(band.lightPixelsInBand).toBeGreaterThan(100);
  });

  it("両フレームを 1 枚に描画すると 1760x760 のシーンになる", async () => {
    const png = await headlessRenderNodes(graph, pageId, [loginFrameId, prReviewFrameId], {
      scale: 1,
    });
    expect(png).not.toBeNull();
    const img = decodePng(ck, png!);
    expect(img.width).toBe(1760);
    expect(img.height).toBe(760);
    expect(countLumaBelow(img, 120)).toBeGreaterThan(20000);
  });
});
