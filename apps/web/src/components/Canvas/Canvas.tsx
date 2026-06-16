import { type Point, type Shape, type Tool } from '@whiteboard/shared';
import { useCallback, useEffect, useRef, useState } from 'react';


import { clearCanvas, renderShapes } from './renderer';

export interface CanvasProps {
  shapes: Shape[] | null;
  tool: Tool;
  panX?: number;
  panY?: number;
  zoom?: number;
  cursor?: string;
  onPointerDown?: (point: Point) => void;
  onPointerMove?: (point: Point) => void;
  onPointerUp?: (point: Point) => void;
  onPointerLeave?: (point: Point) => void;
  onCursorMove?: (point: Point) => void;
}

const DEFAULT_PAN_X = 0;
const DEFAULT_PAN_Y = 0;
const DEFAULT_ZOOM = 1;

export default function Canvas({
  shapes,
  tool,
  panX = DEFAULT_PAN_X,
  panY = DEFAULT_PAN_Y,
  zoom = DEFAULT_ZOOM,
  cursor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onCursorMove,
}: CanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const lastPointRef = useRef<Point | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const apply = (next: { width: number; height: number }): void => {
      const canvas = canvasRef.current;
      if (canvas === null) return;
      if (canvas.width !== next.width) canvas.width = next.width;
      if (canvas.height !== next.height) canvas.height = next.height;
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    const measure = (): void => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(0, Math.round(rect.width));
      const h = Math.max(0, Math.round(rect.height));
      apply({ width: w, height: h });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    const safeZoom = zoom > 0 && Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM;
    clearCanvas(ctx, size.width, size.height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(safeZoom, safeZoom);
    if (shapes !== null) {
      renderShapes(ctx, shapes);
    }
    ctx.restore();
  }, [shapes, panX, panY, zoom, size.height, size.width]);

  const toCanvasPoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (canvas === null) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const safeZoom = zoom > 0 && Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM;
      return {
        x: (event.clientX - rect.left) / safeZoom,
        y: (event.clientY - rect.top) / safeZoom,
      };
    },
    [zoom],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const point = toCanvasPoint(event);
    lastPointRef.current = point;
    onPointerDown?.(point);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const point = toCanvasPoint(event);
    lastPointRef.current = point;
    onPointerMove?.(point);
    onCursorMove?.(point);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const point = toCanvasPoint(event);
    lastPointRef.current = null;
    onPointerUp?.(point);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const point = toCanvasPoint(event);
    lastPointRef.current = null;
    onPointerLeave?.(point);
  };

  const showCursor = cursor ?? 'crosshair';

  return (
    <div
      ref={containerRef}
      className="canvas-fill"
      data-testid="canvas-wrapper"
      style={{ cursor: showCursor }}
    >
      <canvas
        ref={canvasRef}
        data-testid="whiteboard-canvas"
        data-tool={tool}
        width={size.width}
        height={size.height}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
      >
        {`Canvas fallback: whiteboard rendering is not available. (cursor=${showCursor})`}
      </canvas>
    </div>
  );
}
