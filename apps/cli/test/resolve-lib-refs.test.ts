import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveLibRefs } from "../src/resolve-lib-refs";

const read = async (path: string) => (await import("node:fs/promises")).readFile(path, "utf-8");

const PEN = JSON.stringify({
  version: "2.17",
  imports: { ui: "./ui.lib.pen" },
  variables: {
    "--text": { type: "color", value: "$ui:getColor('text-primary')" },
    "--space": { type: "number", value: "$ui:space-2" },
  },
  children: [],
});

const LIB = JSON.stringify({
  version: "2.17",
  variables: {
    "text-primary": { type: "color", value: "#111827" },
    "space-2": { type: "number", value: 8 },
  },
  children: [],
});

describe("resolveLibRefs", () => {
  it("imports のライブラリ変数を解決する", async () => {
    const dir = await mkdtemp(join(tmpdir(), "penhub-"));
    const penPath = join(dir, "design.pen");
    await writeFile(penPath, PEN);
    await writeFile(join(dir, "ui.lib.pen"), LIB);

    const resolved = await resolveLibRefs(PEN, penPath, read);
    const doc = JSON.parse(resolved) as {
      variables: Record<string, { value: unknown }>;
    };
    expect(doc.variables["--text"].value).toBe("#111827");
    expect(doc.variables["--space"].value).toBe(8);
  });

  it("imports が無ければ内容をそのまま返す", async () => {
    const content = JSON.stringify({ version: "2.17", children: [] });
    const resolved = await resolveLibRefs(content, "/tmp/design.pen", read);
    expect(resolved).toBe(content);
  });
});
