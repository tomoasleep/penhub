import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSourceRegistry } from "./source-registry";

describe("createSourceRegistry", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "penhub-reg-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("registers and lists sources", () => {
    const registry = createSourceRegistry();
    registry.registerFolder("folder-1", dir);

    const sources = registry.list();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: "folder-1", type: "folder" });
  });

  it("returns a file tree for a registered source", () => {
    writeFileSync(join(dir, "a.pen"), "{}");
    const registry = createSourceRegistry();
    registry.registerFolder("folder-1", dir);

    const tree = registry.listFiles("folder-1");
    expect(tree).toEqual([{ name: "a.pen", path: "a.pen", type: "file" }]);
  });

  it("throws for an unknown source", () => {
    const registry = createSourceRegistry();
    expect(() => registry.listFiles("nope")).toThrow();
  });
});
