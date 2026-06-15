import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type Point,
  type Shape,
  type Tool,
} from '@whiteboard/shared';
import { useCallback, useEffect, useRef, useState } from 'react';


import { clearCanvas, renderShapes } from './renderer';

export interface CanvasProps {
  shapes: Shape[] | null;
  tool: Tool;
  cursor?: string;
  onPointerDown?: (point: Point) => void;
  onPointerMove?: (point: Point) => void;
  onPointerUp?: (point: Point) => void;
  onPointerLeave?: (point: Point) => void;
  onCursorMove?: (point: Point) => void;
}

export default function Canvas({
  shapes,
  tool,
  cursor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onCursorMove,
}: CanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const lastPointRef = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    clearCanvas(ctx, size.width, size.height);
    if (shapes !== null) {
      renderShapes(ctx, shapes);
    }
  }, [shapes, size.height, size.width]);

  const toCanvasPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (canvas === null) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * size.width) / rect.width,
      y: ((event.clientY - rect.top) * size.height) / rect.height,
    };
  }, [size.height, size.width]);

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

  const resolvedCursor = cursor ?? (tool === 'eraser' ? 'crosshair' : 'crosshair');
  const showCursor = tool === 'eraser' ? 'crosshair' : 'crosshair';

  return (
    <div className="flex h-full items-center justify-center" data-testid="canvas-wrapper">
      <canvas
        ref={canvasRef}
        data-testid="whiteboard-canvas"
        data-tool={tool}
        width={size.width}
        height={size.height}
        style={{ cursor: showCursor, display: 'block', maxWidth: '100%', maxHeight: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
      >
        {`Canvas fallback: whiteboard rendering is not available. (cursor=${resolvedCursor})`}
      </canvas>
    </div>
  );
}
