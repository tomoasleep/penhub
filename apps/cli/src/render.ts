import { readFile } from "node:fs/promises";
import { parsePenFile } from "@open-pencil/pen";
import { headlessRenderNodes, initCanvasKit } from "@open-pencil/core/io/formats/raster";
import type { SceneGraph, SceneNode } from "@open-pencil/scene-graph";
import { resolveLibRefs } from "./resolve-lib-refs.js";

export interface RenderPenOptions {
  scale?: number;
  page?: string;
}

function topNodeIds(graph: SceneGraph, pageId: string): string[] {
  return Array.from(graph.getAllNodes())
    .filter((n) => n.parentId === pageId)
    .map((n) => n.id);
}

function selectPage(graph: SceneGraph, page?: string): SceneNode {
  const pages = graph.getPages();
  if (pages.length === 0) throw new Error("pen ファイルにページがありません");
  if (page === undefined) return pages[0];
  const byName = pages.find((p) => p.name === page);
  if (byName) return byName;
  const index = Number(page);
  if (Number.isInteger(index) && index >= 0 && index < pages.length) return pages[index];
  throw new Error(
    `ページ "${page}" が見つかりません。利用可能: ${pages.map((p) => p.name).join(", ") || "なし"}`,
  );
}

export async function renderPenToPng(filePath: string, options: RenderPenOptions = {}): Promise<Uint8Array> {
  const content = await readFile(filePath, "utf-8");
  const resolved = await resolveLibRefs(content, filePath, (path) => readFile(path, "utf-8"));
  const graph = parsePenFile(resolved);
  const page = selectPage(graph, options.page);
  const nodeIds = topNodeIds(graph, page.id);

  await initCanvasKit();
  const png = await headlessRenderNodes(graph, page.id, nodeIds, {
    scale: options.scale ?? 1,
    format: "PNG",
  });
  if (!png) throw new Error(`pen ファイルのレンダリングに失敗しました: ${filePath}`);
  return png;
}
