const MARKER_PREFIX = "<!-- penhub:node=";
const MARKER_SUFFIX = " -->";

export interface Marker {
  nodeId: string;
  commitId: string;
}

export function encodeMarker(nodeId: string, commitId: string): string {
  return `${MARKER_PREFIX}${nodeId}:commit=${commitId}${MARKER_SUFFIX}`;
}

export function decodeMarker(marker: string): Marker | null {
  const match = marker.match(/^<!-- penhub:node=(.+):commit=(.+) -->$/);
  if (!match) return null;
  return { nodeId: match[1], commitId: match[2] };
}

export function extractMarker(
  text: string
): (Marker & { body: string }) | null {
  const lines = text.split("\n");
  const firstLine = lines[0].trim();
  const marker = decodeMarker(firstLine);
  if (!marker) return null;
  const body = lines.slice(1).join("\n").trim();
  return { ...marker, body };
}
