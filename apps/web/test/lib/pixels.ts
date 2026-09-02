import type { CanvasKit } from "canvaskit-wasm";

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function decodePng(ck: CanvasKit, png: Uint8Array): RgbaImage {
  const image = ck.MakeImageFromEncoded(png);
  if (!image) throw new Error("PNG デコードに失敗しました");
  const width = image.width();
  const height = image.height();
  const data = image.readPixels(0, 0, {
    width,
    height,
    colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul,
    colorSpace: ck.ColorSpace.SRGB,
  });
  image.delete();
  if (!data || !(data instanceof Uint8Array)) throw new Error("ピクセルの取得に失敗しました");
  return { width, height, data };
}

export function countNearColor(
  img: RgbaImage,
  rgb: [number, number, number],
  tolerance = 12,
): number {
  let count = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (
      Math.abs(img.data[i] - rgb[0]) <= tolerance &&
      Math.abs(img.data[i + 1] - rgb[1]) <= tolerance &&
      Math.abs(img.data[i + 2] - rgb[2]) <= tolerance
    ) {
      count++;
    }
  }
  return count;
}

export function countLumaBelow(img: RgbaImage, maxLuma: number): number {
  let count = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const luma = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    if (luma <= maxLuma) count++;
  }
  return count;
}

export interface DarkBandStats {
  rows: number[];
  lightPixelsInBand: number;
}

export function findDarkBand(img: RgbaImage, rgb: [number, number, number], options?: {
  tolerance?: number;
  rowRatio?: number;
  minBandHeight?: number;
}): DarkBandStats {
  const tolerance = options?.tolerance ?? 16;
  const rowRatio = options?.rowRatio ?? 0.5;
  const minBandHeight = options?.minBandHeight ?? 8;
  const { width, height, data } = img;
  const isDark = (i: number) =>
    Math.abs(data[i] - rgb[0]) <= tolerance &&
    Math.abs(data[i + 1] - rgb[1]) <= tolerance &&
    Math.abs(data[i + 2] - rgb[2]) <= tolerance;

  const rows: number[] = [];
  for (let y = 0; y < height; y++) {
    let dark = 0;
    for (let x = 0; x < width; x++) {
      if (isDark((y * width + x) * 4)) dark++;
    }
    if (dark >= width * rowRatio) rows.push(y);
  }
  const bands: Array<[number, number]> = [];
  for (const y of rows) {
    const last = bands[bands.length - 1];
    if (last && y === last[1] + 1) last[1] = y;
    else bands.push([y, y]);
  }
  const band = bands.find(([start, end]) => end - start + 1 >= minBandHeight);
  if (!band) return { rows: [], lightPixelsInBand: 0 };

  let lightPixelsInBand = 0;
  for (let y = band[0]; y <= band[1]; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] >= 230 && data[i + 1] >= 230 && data[i + 2] >= 230) lightPixelsInBand++;
    }
  }
  return { rows, lightPixelsInBand };
}

export function nonBackgroundRatio(
  img: RgbaImage,
  bg: [number, number, number],
  tolerance = 8,
): number {
  let different = 0;
  let total = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    total++;
    if (
      Math.abs(img.data[i] - bg[0]) > tolerance ||
      Math.abs(img.data[i + 1] - bg[1]) > tolerance ||
      Math.abs(img.data[i + 2] - bg[2]) > tolerance
    ) {
      different++;
    }
  }
  return different / total;
}
