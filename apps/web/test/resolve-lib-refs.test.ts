import { describe, expect, it } from "vitest";
import { resolveLibRefs } from "../src/lib/resolve-lib-refs";

const LIB = JSON.stringify({
  version: "2.17",
  variables: {
    primary: { type: "color", value: "#3B82F6" },
    "text-primary": { type: "color", value: "#111827" },
    "space-1": { type: "number", value: 4 },
    "space-2": { type: "number", value: 8 },
    "font-heading": { type: "number", value: 24 },
    "font-family": { type: "string", value: "Inter" },
  },
  children: [],
});

function makeFetch(files: Record<string, string>) {
  return async (path: string) => {
    const content = files[path];
    if (content === undefined) throw new Error(`not found: ${path}`);
    return content;
  };
}

describe("resolveLibRefs", () => {
  it("imports が無い場合は content をそのまま返す", async () => {
    const content = JSON.stringify({ version: "2.17", children: [] });
    const result = await resolveLibRefs(content, "a.pen", "src", makeFetch({}));
    expect(result).toBe(content);
  });

  it("$lib:getColor をライブラリの color 変数に解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen" },
      children: [
        { id: "a", type: "frame", fill: "$lib:getColor(\"primary\")" },
      ],
    });
    const result = await resolveLibRefs(content, "src/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].fill).toBe("#3B82F6");
  });

  it("$lib:getSpace をライブラリの number 変数に解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen" },
      children: [
        { id: "a", type: "frame", gap: "$lib:getSpace(\"space-2\")" },
      ],
    });
    const result = await resolveLibRefs(content, "src/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].gap).toBe(8);
  });

  it("$lib:getFontSize をライブラリの number 変数に解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen" },
      children: [
        { id: "a", type: "text", fontSize: "$lib:getFontSize(\"font-heading\")" },
      ],
    });
    const result = await resolveLibRefs(content, "src/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].fontSize).toBe(24);
  });

  it("未知の number 系 getter をライブラリの number 変数に解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen" },
      children: [
        { id: "a", type: "frame", gap: "$lib:getGap(\"space-2\")", padding: "$lib:getRadius(\"space-1\")" },
      ],
    });
    const result = await resolveLibRefs(content, "src/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].gap).toBe(8);
    expect(doc.children[0].padding).toBe(4);
  });

  it("string 変数を getter で解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen" },
      children: [
        { id: "a", type: "text", fontFamily: "$lib:getFontFamily(\"font-family\")" },
      ],
    });
    const result = await resolveLibRefs(content, "src/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].fontFamily).toBe("Inter");
  });

  it("複数エイリアスを解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen", other: "./other.lib.pen" },
      children: [
        { id: "a", type: "frame", fill: "$lib:getColor(\"primary\")", gap: "$other:getSpace(\"space-1\")" },
      ],
    });
    const other = JSON.stringify({
      version: "2.17",
      variables: { "space-1": { type: "number", value: 4 } },
      children: [],
    });
    const result = await resolveLibRefs(content, "src/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB, "src/other.lib.pen": other }));
    const doc = JSON.parse(result);
    expect(doc.children[0].fill).toBe("#3B82F6");
    expect(doc.children[0].gap).toBe(4);
  });

  it("未解決の参照は元の文字列のまま残す", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen" },
      children: [
        { id: "a", type: "frame", gap: "$lib:getSpace(\"missing\")" },
        { id: "b", type: "frame", fill: "$lib:getColor(\"space-1\")" },
      ],
    });
    const result = await resolveLibRefs(content, "src/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].gap).toBe("$lib:getSpace(\"missing\")");
    expect(doc.children[1].fill).toBe("$lib:getColor(\"space-1\")");
  });

  it("相対パス ../ を正規化してライブラリを解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "../design.lib.pen" },
      children: [{ id: "a", type: "frame", gap: "$lib:getSpace(\"space-2\")" }],
    });
    const result = await resolveLibRefs(content, "src/screens/a.pen", "src", makeFetch({ "src/design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].gap).toBe(8);
  });

  it("ディレクトリの無いファイルからの相対パスを解決する", async () => {
    const content = JSON.stringify({
      version: "2.17",
      imports: { lib: "./design.lib.pen" },
      children: [{ id: "a", type: "frame", gap: "$lib:getSpace(\"space-1\")" }],
    });
    const result = await resolveLibRefs(content, "a.pen", "src", makeFetch({ "design.lib.pen": LIB }));
    const doc = JSON.parse(result);
    expect(doc.children[0].gap).toBe(4);
  });
});
