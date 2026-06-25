/**
 * Canvas renderer — draws all shapes from scratch on every repaint.
 *
 * `clearCanvas` fills the full canvas with white before redraw.
 * `renderShapes` iterates the shapes array, sets `lineCap`/`lineJoin` to
 * 'round' for smooth strokes, and dispatches by shape type.
 * Each `draw*` function uses the standard Canvas 2D API.
 *
 * Note: `drawCircle` special-cases `radius <= 0` to avoid browser console
 * warnings for negative radii passed to `ctx.arc`.
 */
import { CANVAS_BACKGROUND, type Shape } from '@whiteboard/shared';

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
  // Round caps and joins produce smooth, connected stroke segments.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const shape of shapes) {
    switch (shape.type) {
      case 'pen':
        drawPenStroke(ctx, shape);
        break;
      case 'rect':
        drawRect(ctx, shape);
        break;
      case 'triangle':
        drawTriangle(ctx, shape);
        break;
      case 'circle':
        drawCircle(ctx, shape);
        break;
    }
  }
}

// Draws a connected polyline from a flat points array [x0,y0,x1,y1,...].
function drawPenStroke(ctx: CanvasRenderingContext2D, shape: Extract<Shape, { type: 'pen' }>): void {
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

// Normalizes the rect to top-left origin + positive width/height before
// stroking, since the user may have dragged in any direction.
function drawRect(ctx: CanvasRenderingContext2D, shape: Extract<Shape, { type: 'rect' }>): void {
  const x = Math.min(shape.start.x, shape.end.x);
  const y = Math.min(shape.start.y, shape.end.y);
  const w = Math.abs(shape.end.x - shape.start.x);
  const h = Math.abs(shape.end.y - shape.start.y);
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.strokeRect(x, y, w, h);
}

// Draws a closed triangle path from 3 vertices (a, b, c).
function drawTriangle(ctx: CanvasRenderingContext2D, shape: Extract<Shape, { type: 'triangle' }>): void {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.beginPath();
  ctx.moveTo(shape.a.x, shape.a.y);
  ctx.lineTo(shape.b.x, shape.b.y);
  ctx.lineTo(shape.c.x, shape.c.y);
  ctx.closePath();
  ctx.stroke();
}

// Draws a circle via ctx.arc. When radius <= 0, draws a zero-radius arc
// (a dot at the center) to avoid canvas API warnings for negative radii.
function drawCircle(ctx: CanvasRenderingContext2D, shape: Extract<Shape, { type: 'circle' }>): void {
  if (shape.radius <= 0) {
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.width;
    ctx.beginPath();
    ctx.arc(shape.center.x, shape.center.y, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.beginPath();
  ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
  ctx.stroke();
}
