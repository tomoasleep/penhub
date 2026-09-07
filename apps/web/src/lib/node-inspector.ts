import type { Color, SceneNode } from "@open-pencil/scene-graph";

export interface InspectField {
  label: string;
  value: string;
}

export interface InspectSwatch {
  hex: string;
  alpha: number;
  type: string;
}

export interface InspectSection {
  title: string;
  fields: InspectField[];
  swatches?: InspectSwatch[];
}

export interface NodeSummary {
  name: string;
  type: string;
  sections: InspectSection[];
}

export function colorToHex(color: Color): string {
  const to255 = (v: number) =>
    Math.round(Math.min(Math.max(v, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(color.r)}${to255(color.g)}${to255(color.b)}`.toUpperCase();
}

function num(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function fields(...pairs: [string, string | undefined | null][]): InspectField[] {
  return pairs
    .filter((pair): pair is [string, string] => pair[1] !== undefined && pair[1] !== null)
    .map(([label, value]) => ({ label, value }));
}

function positionSection(node: SceneNode): InspectSection {
  return {
    title: "Position",
    fields: fields(
      ["X", num(node.x)],
      ["Y", num(node.y)],
      ["Rotation", `${num(node.rotation)}°`],
    ),
  };
}

function dimensionsSection(node: SceneNode): InspectSection {
  return {
    title: "Dimensions",
    fields: fields(["W", num(node.width)], ["H", num(node.height)]),
  };
}

function layoutSection(node: SceneNode): InspectSection | null {
  if (node.layoutMode === "NONE") return null;
  const padding = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft];
  const hasPadding = padding.some((p) => p !== 0);
  return {
    title: "Layout",
    fields: fields(
      ["Direction", node.layoutMode],
      ["Gap", num(node.itemSpacing)],
      ["Padding", hasPadding ? padding.map(num).join(" ") : undefined],
      ["Primary Sizing", node.primaryAxisSizing],
      ["Counter Sizing", node.counterAxisSizing],
    ),
  };
}

function appearanceSection(node: SceneNode): InspectSection {
  return {
    title: "Appearance",
    fields: fields(
      ["Opacity", `${Math.round(node.opacity * 100)}%`],
      ["Corner Radius", node.cornerRadius !== 0 ? num(node.cornerRadius) : undefined],
      ["Blend Mode", node.blendMode !== "NORMAL" ? node.blendMode : undefined],
      ["Clip Content", node.clipsContent ? "On" : undefined],
      ["Visible", !node.visible ? "Hidden" : undefined],
      ["Locked", node.locked ? "Locked" : undefined],
    ),
  };
}

function fillSection(node: SceneNode): InspectSection | null {
  const visibleFills = node.fills.filter((f) => f.visible);
  if (visibleFills.length === 0) return null;
  return {
    title: "Fill",
    swatches: visibleFills.map((f) => ({
      hex: colorToHex(f.color),
      alpha: f.opacity,
      type: f.type,
    })),
    fields: [],
  };
}

function strokeSection(node: SceneNode): InspectSection | null {
  const strokes = node.strokes.filter((s) => s.visible);
  if (strokes.length === 0) return null;
  return {
    title: "Stroke",
    swatches: strokes.map((s) => ({
      hex: colorToHex(s.color),
      alpha: s.opacity,
      type: s.align,
    })),
    fields: fields(
      ["Weight", num(node.borderTopWeight)],
      ["Align", node.strokes[0]!.align],
    ),
  };
}

function textSection(node: SceneNode): InspectSection | null {
  if (node.type !== "TEXT") return null;
  return {
    title: "Text",
    fields: fields(
      ["Font", `${node.fontFamily} ${node.fontWeight}`],
      ["Size", num(node.fontSize)],
      ["Align", node.textAlignHorizontal],
      ["Line Height", node.lineHeight !== null ? num(node.lineHeight) : undefined],
      ["Letter Spacing", node.letterSpacing !== 0 ? num(node.letterSpacing) : undefined],
      ["Content", node.text !== "" ? node.text : undefined],
    ),
  };
}

export function summarizeNode(node: SceneNode): NodeSummary {
  const sections = [
    positionSection(node),
    dimensionsSection(node),
    layoutSection(node),
    appearanceSection(node),
    fillSection(node),
    strokeSection(node),
    textSection(node),
  ].filter((s): s is InspectSection => s !== null);
  return { name: node.name, type: node.type, sections };
}
