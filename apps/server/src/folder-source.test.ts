import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFolderSource } from "./folder-source";

describe("createFolderSource", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "penhub-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns a file tree with nested directories", () => {
    mkdirSync(join(dir, "src", "screens"), { recursive: true });
    writeFileSync(join(dir, "src", "screens", "login.pen"), "{}");
    writeFileSync(join(dir, "src", "screens", "signup.pen"), "{}");
    writeFileSync(join(dir, "README.md"), "# readme");

    const source = createFolderSource("folder-1", dir);
    const tree = source.listFiles();

    expect(tree).toEqual([
      {
        name: "src",
        path: "src",
        type: "dir",
        children: [
          {
            name: "screens",
            path: "src/screens",
            type: "dir",
            children: [
              { name: "login.pen", path: "src/screens/login.pen", type: "file" },
              { name: "signup.pen", path: "src/screens/signup.pen", type: "file" },
            ],
          },
        ],
      },
      { name: "README.md", path: "README.md", type: "file" },
    ]);
  });

  it("sorts directories before files", () => {
    writeFileSync(join(dir, "a.txt"), "a");
    mkdirSync(join(dir, "zdir"));
    writeFileSync(join(dir, "zdir", "b.txt"), "b");

    const tree = createFolderSource("folder-1", dir).listFiles();

    expect(tree.map((n) => n.name)).toEqual(["zdir", "a.txt"]);
  });

  it("reads a file by path", () => {
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "login.pen"), '{"version":"1"}');

    const source = createFolderSource("folder-1", dir);
    expect(source.readFile("src/login.pen")).toBe('{"version":"1"}');
  });

  it("throws when reading a missing file", () => {
    const source = createFolderSource("folder-1", dir);
    expect(() => source.readFile("nope.pen")).toThrow();
  });
});
