import { CANVAS_BACKGROUND } from '@whiteboard/shared';
import type { Shape } from '@whiteboard/shared';

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, width, height);
}

export function renderShapes(
  ctx: CanvasRenderingContext2D,
  shapes: readonly Shape[],
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const shape of shapes) {
    if (shape.type === 'pen') {
      drawPenStroke(ctx, shape);
    } else {
      drawRect(ctx, shape);
    }
  }
}

function drawPenStroke(
  ctx: CanvasRenderingContext2D,
  shape: Extract<Shape, { type: 'pen' }>,
): void {
  if (shape.points.length < 2) return;
  const firstX = shape.points[0];
  const firstY = shape.points[1];
  if (firstX === undefined || firstY === undefined) return;
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.beginPath();
  ctx.moveTo(firstX, firstY);
  for (let i = 2; i < shape.points.length; i += 2) {
    const x = shape.points[i];
    const y = shape.points[i + 1];
    if (x === undefined || y === undefined) continue;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  shape: Extract<Shape, { type: 'rect' }>,
): void {
  const x = Math.min(shape.start.x, shape.end.x);
  const y = Math.min(shape.start.y, shape.end.y);
  const w = Math.abs(shape.end.x - shape.start.x);
  const h = Math.abs(shape.end.y - shape.start.y);
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.strokeRect(x, y, w, h);
}
