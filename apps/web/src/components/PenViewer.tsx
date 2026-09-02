import { useEffect, useRef, useState } from "react";
import { parsePenFile } from "@open-pencil/pen";
import { getCanvasKit } from "@open-pencil/core/canvaskit";
import { SkiaRenderer } from "@open-pencil/core/canvas";
import { hitTest } from "@open-pencil/scene-graph/hit-test";
import type { SceneGraph } from "@open-pencil/scene-graph";
import canvaskitWasmUrl from "canvaskit-wasm/bin/canvaskit.wasm?url";

interface Props {
  filePath: string;
  content: string;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export function PenViewer({ filePath, content, selectedNodeId, onSelectNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);

  const graphRef = useRef<SceneGraph | null>(null);
  const rendererRef = useRef<SkiaRenderer | null>(null);
  const ckRef = useRef<Awaited<ReturnType<typeof getCanvasKit>> | null>(null);
  const pageIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const graph = parsePenFile(content);
        graphRef.current = graph;
        const pageNodes = graph.getPages();
        const pageIds = pageNodes.map((p) => p.id);
        setPages(pageIds);
        const firstPage = pageIds[0] ?? null;
        pageIdRef.current = firstPage;
        setPageId(firstPage);
        onSelectNode(null);

        if (!ckRef.current) {
          ckRef.current = await getCanvasKit({
            locateFile: (file) => (file.endsWith(".wasm") ? canvaskitWasmUrl : file),
          });
        }
        if (cancelled) return;
        await draw();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content]);

  async function draw() {
    const canvas = canvasRef.current;
    const graph = graphRef.current;
    const ck = ckRef.current;
    const pid = pageIdRef.current;
    if (!canvas || !graph || !ck || !pid) return;

    try {
      const surface = ck.MakeWebGLCanvasSurface(canvas, undefined, {
        alpha: 1,
        antialias: 1,
        preserveDrawingBuffer: 1,
      });
      if (!surface) {
        setError("CanvasKit surface の作成に失敗しました");
        return;
      }
      const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
      const renderer = new SkiaRenderer(ck, surface, gl);
      rendererRef.current = renderer;
      renderer.pageId = pid;
      renderer.viewportWidth = canvas.width;
      renderer.viewportHeight = canvas.height;
      renderer.dpr = 1;
      renderer.panX = 0;
      renderer.panY = 0;
      renderer.zoom = 1;
      await renderer.loadFonts();
      renderer.invalidateAllPictures();
      const ckCanvas = surface.getCanvas();
      renderer.renderSceneToCanvas(ckCanvas, graph, pid);
      surface.flush();
    } catch (e) {
      setError(`描画エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useEffect(() => {
    pageIdRef.current = pageId;
    draw().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [pageId, selectedNodeId]);

  if (error) {
    return <div className="viewer-error">読み込みエラー: {error}</div>;
  }

  return (
    <div className="viewer">
      <div className="file-header">
        <span className="path">{filePath}</span>
        {pages.length > 1 && (
          <div className="page-tabs">
            {pages.map((id) => (
              <button
                key={id}
                className={`page-tab ${id === pageId ? "active" : ""}`}
                onClick={() => setPageId(id)}
              >
                {id}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="canvas-area">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="canvas"
          onClick={(e) => {
            const graph = graphRef.current;
            if (!graph || !pageId) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const hit = hitTest(graph, x, y, pageId);
            onSelectNode(hit?.id ?? null);
          }}
        />
      </div>
    </div>
  );
}
