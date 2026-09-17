import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderPenToPng } from "../src/render";

const DEMO_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../demo/penhub-demo.pen");

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

describe("renderPenToPng", () => {
  it("pen ファイルを PNG としてレンダリングする", async () => {
    const png = await renderPenToPng(DEMO_PATH);
    expect(png).not.toBeNull();
    expect(Array.from(png.slice(0, 4))).toEqual(PNG_SIGNATURE);
    expect(png.length).toBeGreaterThan(1000);
  });

  it("scale を指定すると拡大される", async () => {
    const png = await renderPenToPng(DEMO_PATH, { scale: 2 });
    const png1 = await renderPenToPng(DEMO_PATH, { scale: 1 });
    expect(png.length).toBeGreaterThan(png1.length);
  });

  it("存在しないページを指定するとエラーを投げる", async () => {
    await expect(renderPenToPng(DEMO_PATH, { page: "No Such Page" })).rejects.toThrow(
      /ページ .* が見つかりません/,
    );
  });
});
