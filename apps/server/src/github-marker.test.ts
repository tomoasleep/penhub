import { describe, it, expect } from "vitest";
import { encodeMarker, decodeMarker, extractMarker } from "./github-marker";

describe("github-marker", () => {
  it("encodes a marker with node and commit", () => {
    const marker = encodeMarker("0:5", "abc123");
    expect(marker).toBe("<!-- penhub:node=0:5:commit=abc123 -->");
  });

  it("decodes a marker", () => {
    const decoded = decodeMarker("<!-- penhub:node=0:5:commit=abc123 -->");
    expect(decoded).toEqual({ nodeId: "0:5", commitId: "abc123" });
  });

  it("extracts marker and body from a comment", () => {
    const result = extractMarker(
      "<!-- penhub:node=0:5:commit=abc123 -->\nこのボタンの色が問題"
    );
    expect(result).toEqual({
      nodeId: "0:5",
      commitId: "abc123",
      body: "このボタンの色が問題",
    });
  });

  it("returns null when no marker is present", () => {
    const result = extractMarker("普通のコメント");
    expect(result).toBeNull();
  });

  it("handles a comment without a body after the marker", () => {
    const result = extractMarker("<!-- penhub:node=0:3:commit=xyz -->");
    expect(result).toEqual({ nodeId: "0:3", commitId: "xyz", body: "" });
  });
});
