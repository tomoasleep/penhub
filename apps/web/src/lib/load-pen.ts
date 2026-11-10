import { penFormat } from "@open-pencil/core/io";
import type { SceneGraph } from "@open-pencil/scene-graph";
import { resolveLibRefs, type LibRefResolver } from "./resolve-lib-refs";

export async function loadPenGraph(
  content: string,
  filePath: string,
  readFile: LibRefResolver,
): Promise<SceneGraph> {
  const resolved = await resolveLibRefs(content, filePath, "", readFile);
  const { graph } = await penFormat.readDocument!({
    name: filePath,
    data: new TextEncoder().encode(resolved),
  });
  return graph;
}
