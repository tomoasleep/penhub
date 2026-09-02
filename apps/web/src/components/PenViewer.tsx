import { useEffect, useRef, useState } from "react";
import { parsePenFile } from "@open-pencil/pen";
import { getCanvasKit } from "@open-pencil/core/canvaskit";
import { SkiaRenderer } from "@open-pencil/core/canvas";
import { hitTest } from "@open-pencil/scene-graph/hit-test";
import { computeContentBounds } from "@open-pencil/core/io/formats/raster";
import type { SceneGraph } from "@open-pencil/scene-graph";
import type { Surface } from "canvaskit-wasm";
import canvaskitWasmUrl from "canvaskit-wasm/bin/canvaskit.wasm?url";

interface Props {
  filePath: string;
  content: string;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

interface ViewState {
  panX: number;
  panY: number;
  zoom: number;
}

interface GlState {
  surface: Surface;
  renderer: SkiaRenderer;
}

function topNodeIds(graph: SceneGraph, pageId: string): string[] {
  return Array.from(graph.getAllNodes())
    .filter((n) => n.parentId === pageId)
    .map((n) => n.id);
}

function fitView(
  canvas: HTMLCanvasElement,
  graph: SceneGraph,
  nodeIds: string[],
): ViewState {
  const bounds = computeContentBounds(graph, nodeIds);
  if (!bounds || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    return { panX: 0, panY: 0, zoom: 1 };
  }
  const margin = 24;
  const vw = Math.max(canvas.width - margin * 2, 1);
  const vh = Math.max(canvas.height - margin * 2, 1);
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const zoom = Math.min(vw / bw, vh / bh, 1);
  return {
    zoom,
    panX: (canvas.width - bw * zoom) / 2 - bounds.minX * zoom,
    panY: (canvas.height - bh * zoom) / 2 - bounds.minY * zoom,
  };
}

export function PenViewer({ filePath, content, selectedNodeId, onSelectNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);

  const graphRef = useRef<SceneGraph | null>(null);
  const rendererRef = useRef<SkiaRenderer | null>(null);
  const ckRef = useRef<Awaited<ReturnType<typeof getCanvasKit>> | null>(null);
  const pageIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const glRef = useRef<GlState | null>(null);
  const glSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const viewRef = useRef<ViewState>({ panX: 0, panY: 0, zoom: 1 });
  const fitRequestedRef = useRef(true);
  const drawQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    selectedIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    fitRequestedRef.current = true;
  }, [content, pageId]);

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
        scheduleDraw();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content]);

  function scheduleDraw(): Promise<void> {
    drawQueueRef.current = drawQueueRef.current
      .then(() => draw())
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return drawQueueRef.current;
  }

  async function draw() {
    const canvas = canvasRef.current;
    const graph = graphRef.current;
    const ck = ckRef.current;
    const pid = pageIdRef.current;
    if (!canvas || !graph || !ck || !pid) return;

    let gl = glRef.current;
    if (!gl || glSizeRef.current.w !== canvas.width || glSizeRef.current.h !== canvas.height) {
      const surface = ck.MakeWebGLCanvasSurface(canvas, undefined, {
        alpha: 1,
        antialias: 1,
        preserveDrawingBuffer: 1,
      });
      if (!surface) {
        setError("CanvasKit surface の作成に失敗しました");
        return;
      }
      if (gl) {
        gl.renderer.replaceSurface(surface);
        gl.surface.delete();
        gl.surface = surface;
      } else {
        const glctx = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
        const renderer = new SkiaRenderer(ck, surface, glctx);
        gl = { surface, renderer };
        glRef.current = gl;
      }
      glSizeRef.current = { w: canvas.width, h: canvas.height };
      gl.renderer.invalidateAllPictures();
    }
    const { surface, renderer } = gl;
    rendererRef.current = renderer;
    renderer.pageId = pid;
    renderer.viewportWidth = canvas.width;
    renderer.viewportHeight = canvas.height;
    renderer.panX = viewRef.current.panX;
    renderer.panY = viewRef.current.panY;
    renderer.zoom = viewRef.current.zoom;

    await renderer.loadFonts();

    const nodeIds = topNodeIds(graph, pid);
    const restoreMeasurer = await renderer.prepareForExport(graph, pid, nodeIds);

    if (fitRequestedRef.current) {
      fitRequestedRef.current = false;
      viewRef.current = fitView(canvas, graph, nodeIds);
    }
    renderer.panX = viewRef.current.panX;
    renderer.panY = viewRef.current.panY;
    renderer.zoom = viewRef.current.zoom;

    const selectedIds = selectedIdRef.current ? new Set([selectedIdRef.current]) : new Set<string>();
    renderer.render(graph, selectedIds, {}, -1, "scene");
    surface.flush();
    restoreMeasurer();
  }

  useEffect(() => {
    pageIdRef.current = pageId;
    scheduleDraw();
  }, [pageId, selectedNodeId]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();

    const observer = new ResizeObserver(() => {
      resize();
      scheduleDraw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
      <div className="canvas-area" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="canvas"
          onClick={(e) => {
            const graph = graphRef.current;
            const renderer = rendererRef.current;
            if (!graph || !pageId || !renderer) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const p = renderer.screenToCanvas(
              e.clientX - rect.left,
              e.clientY - rect.top,
            );
            const hit = hitTest(graph, p.x, p.y, pageId);
            onSelectNode(hit?.id ?? null);
          }}
        />
      </div>
    </div>
  );
}
