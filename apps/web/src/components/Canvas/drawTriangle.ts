/**
 * Triangle tool — creates and updates TriangleShape in the Yjs Y.Array.
 *
 * `startTriangle` creates a degenerate triangle (all 3 vertices at the
 * same pointer-down point).
 *
 * `updateTriangle` sets vertex `b` to the drag end and computes vertex
 * `c` (the apex) via `computeApex`, which creates an equilateral triangle
 * where the apex sits above the base midpoint at `(baseLength * √3) / 2`.
 * The shape is replaced inside a Yjs transaction.
 */
import { generateShapeId, isTriangleShape, type Point, type Shape, type TriangleShape } from '@whiteboard/shared';
import type * as Y from 'yjs';


export function startTriangle(
  shapes: Y.Array<Shape>,
  authorId: string,
  authorColor: string,
  point: Point,
  color: string,
  width: number,
): TriangleShape {
  const triangle: TriangleShape = {
    id: generateShapeId(),
    type: 'triangle',
    authorId,
    authorColor,
    createdAt: Date.now(),
    color,
    width,
    a: { x: point.x, y: point.y },
    b: { x: point.x, y: point.y },
    c: { x: point.x, y: point.y },
  };
  shapes.push([triangle]);
  return triangle;
}

export function updateTriangle(
  shapes: Y.Array<Shape>,
  triangleId: string,
  end: Point,
): void {
  const arr = shapes.toArray();
  const idx = arr.findIndex((s) => s.id === triangleId);
  if (idx === -1) return;
  const current = arr[idx];
  if (current === undefined || !isTriangleShape(current)) return;
  const start = current.a;
  const updated: TriangleShape = {
    ...current,
    a: { x: start.x, y: start.y },
    b: { x: end.x, y: end.y },
    c: computeApex(start, end),
  };
  shapes.doc?.transact(() => {
    shapes.delete(idx, 1);
    shapes.insert(idx, [updated]);
  });
}

// Computes the apex of an equilateral triangle given base endpoints.
// The apex is placed above the midpoint at height = (baseLength * √3) / 2.
function computeApex(start: Point, end: Point): Point {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const baseLength = Math.hypot(dx, dy);
  if (baseLength === 0) {
    return { x: midX, y: midY };
  }
  const height = (baseLength * Math.sqrt(3)) / 2;
  return { x: midX, y: midY - height };
}
