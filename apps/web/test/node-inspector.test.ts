import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { parsePenFile } from "@open-pencil/pen";
import type { SceneGraph, SceneNode } from "@open-pencil/scene-graph";
import { colorToHex, summarizeNode } from "../src/lib/node-inspector";

const DEMO_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../demo/penhub-demo.pen");

let graph: SceneGraph;

beforeAll(() => {
  graph = parsePenFile(readFileSync(DEMO_PATH, "utf-8"));
});

function findNode(pred: (n: SceneNode) => boolean): SceneNode {
  const node = Array.from(graph.getAllNodes()).find((n) => n.type !== "CANVAS" && pred(n));
  if (!node) throw new Error("node not found");
  return node;
}

describe("colorToHex", () => {
  it("0-1 の RGBA を #RRGGBB に変換する", () => {
    expect(colorToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe("#FFFFFF");
    expect(colorToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe("#000000");
    expect(colorToHex({ r: 0.06666667014360428, g: 0.0941176488995552, b: 0.15294118225574493, a: 1 })).toBe("#111827");
  });
});

describe("summarizeNode", () => {
  it("frame node の基本属性を section として返す", () => {
    const frame = findNode((n) => n.name === "Login Screen");
    const summary = summarizeNode(frame);

    expect(summary.name).toBe("Login Screen");
    expect(summary.type).toBe("FRAME");

    const byTitle = Object.fromEntries(summary.sections.map((s) => [s.title, s]));
    const field = (title: string, label: string) =>
      byTitle[title]?.fields.find((f) => f.label === label)?.value;

    expect(field("Position", "X")).toBe("0");
    expect(field("Dimensions", "W")).toBe("480");
    expect(field("Layout", "Direction")).toBe("VERTICAL");
    expect(field("Layout", "Gap")).toBe("24");
    expect(field("Appearance", "Opacity")).toBe("100%");
  });

  it("fill の色を swatch として返す", () => {
    const filled = findNode((n) => n.fills.length > 0 && n.fills[0]!.type === "SOLID");
    const summary = summarizeNode(filled);

    const fill = summary.sections.find((s) => s.title === "Fill");
    expect(fill).toBeDefined();
    expect(fill!.swatches!.length).toBeGreaterThan(0);
    expect(fill!.swatches![0]!.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("text node は Text section を持つ", () => {
    const text = findNode((n) => n.type === "TEXT");
    const summary = summarizeNode(text);

    const textSection = summary.sections.find((s) => s.title === "Text");
    expect(textSection).toBeDefined();
    const labels = textSection!.fields.map((f) => f.label);
    expect(labels).toContain("Font");
    expect(labels).toContain("Size");
    expect(labels).toContain("Align");
  });

  it("layout を持たない node は Layout section を持たない", () => {
    const plain = findNode(
      (n) => n.layoutMode === "NONE" && n.type !== "CANVAS" && n.type !== "TEXT",
    );
    const summary = summarizeNode(plain);
    expect(summary.sections.find((s) => s.title === "Layout")).toBeUndefined();
  });
});
