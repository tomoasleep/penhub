import { describe, expect, it } from "vitest";
import type { SceneGraph, SceneNode } from "@open-pencil/scene-graph";
import { loadPenGraph } from "../src/lib/load-pen";
import { colorToHex } from "../src/lib/node-inspector";

function load(doc: unknown): Promise<SceneGraph> {
  return loadPenGraph(JSON.stringify(doc), "a.pen", async (path) => {
    throw new Error(`not found: ${path}`);
  });
}

function byName(graph: SceneGraph, name: string): SceneNode {
  const node = Array.from(graph.getAllNodes()).find((n) => n.type !== "CANVAS" && n.name === name);
  if (!node) throw new Error(`node not found: ${name}`);
  return node;
}

function fillHex(node: SceneNode): string {
  const fill = node.fills[0];
  if (fill?.type !== "SOLID") throw new Error(`not a solid fill: ${node.name}`);
  return colorToHex(fill.color);
}

describe("pen.dev 2.22 format", () => {
  it("theme を持つ frame は theme に合う変数値で塗られる", async () => {
    const graph = await load({
      version: "2.22",
      themes: { mode: ["light", "dark"] },
      variables: {
        surface: {
          type: "color",
          value: [
            { value: "#FFFFFF", theme: { mode: "light" } },
            { value: "#111827", theme: { mode: "dark" } },
          ],
        },
      },
      children: [
        { id: "l", name: "Light", type: "frame", width: 10, height: 10, fill: "$surface" },
        {
          id: "d",
          name: "Dark",
          type: "frame",
          width: 10,
          height: 10,
          theme: { mode: "dark" },
          fill: "$surface",
        },
      ],
    });

    expect(fillHex(byName(graph, "Light"))).toBe("#FFFFFF");
    expect(fillHex(byName(graph, "Dark"))).toBe("#111827");
  });

  it("getter 形式の名前を持つローカル変数を解決する", async () => {
    const graph = await load({
      version: "2.22",
      variables: {
        "getSpace(1/2)": { type: "number", value: 2 },
        surface: { type: "color", value: "#FFFFFF" },
      },
      children: [
        {
          id: "a",
          name: "Stack",
          type: "frame",
          layout: "vertical",
          gap: "$getSpace(1/2)",
          fill: "$surface",
        },
      ],
    });

    const stack = byName(graph, "Stack");
    expect(stack.itemSpacing).toBe(2);
    expect(fillHex(stack)).toBe("#FFFFFF");
  });

  it("auto layout の子要素が layout 済みの位置で読み込まれる", async () => {
    const graph = await load({
      version: "2.22",
      children: [
        {
          id: "row",
          name: "Row",
          type: "frame",
          layout: "horizontal",
          gap: 8,
          padding: 4,
          children: [
            { id: "a", name: "A", type: "rectangle", width: 10, height: 10, fill: "#000000" },
            { id: "b", name: "B", type: "rectangle", width: 10, height: 10, fill: "#000000" },
          ],
        },
      ],
    });

    expect(byName(graph, "B").x).toBe(22);
    expect(byName(graph, "Row").width).toBe(36);
  });

  it("ellipse の arc と ring を読み込む", async () => {
    const graph = await load({
      version: "2.22",
      children: [
        {
          id: "e",
          name: "Arc",
          type: "ellipse",
          width: 40,
          height: 40,
          fill: "#3B82F6",
          innerRadius: 0.5,
          startAngle: 90,
          sweepAngle: 180,
        },
      ],
    });

    expect(byName(graph, "Arc").arcData).toMatchObject({ innerRadius: 0.5 });
  });

  it("note / script / browser と shader・mesh_gradient fill を含む document を読み込める", async () => {
    const graph = await load({
      version: "2.22",
      children: [
        {
          id: "f",
          name: "Screen",
          type: "frame",
          width: 200,
          height: 200,
          fill: [
            "#FFFFFF",
            { type: "shader", url: "./effect.glsl" },
            { type: "mesh_gradient", columns: 2, rows: 2, colors: ["#000", "#fff", "#000", "#fff"] },
          ],
          children: [
            { id: "n", name: "Note", type: "note", content: "memo" },
            { id: "s", name: "Script", type: "script", scriptUri: "./gen.js", width: 20, height: 20 },
            { id: "b", name: "Browser", type: "browser", url: "https://example.com", width: 20, height: 20 },
          ],
        },
      ],
    });

    expect(fillHex(byName(graph, "Screen"))).toBe("#FFFFFF");
  });
});
