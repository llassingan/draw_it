import { generateShapeId, isCircleShape, type Point, type Shape, type CircleShape } from '@whiteboard/shared';
import type * as Y from 'yjs';


export function startCircle(
  shapes: Y.Array<Shape>,
  authorId: string,
  authorColor: string,
  point: Point,
  color: string,
  width: number,
): CircleShape {
  const circle: CircleShape = {
    id: generateShapeId(),
    type: 'circle',
    authorId,
    authorColor,
    createdAt: Date.now(),
    color,
    width,
    center: { x: point.x, y: point.y },
    radius: 0,
  };
  shapes.push([circle]);
  return circle;
}

export function updateCircle(
  shapes: Y.Array<Shape>,
  circleId: string,
  end: Point,
): void {
  const arr = shapes.toArray();
  const idx = arr.findIndex((s) => s.id === circleId);
  if (idx === -1) return;
  const current = arr[idx];
  if (current === undefined || !isCircleShape(current)) return;
  const dx = end.x - current.center.x;
  const dy = end.y - current.center.y;
  const updated: CircleShape = {
    ...current,
    radius: Math.hypot(dx, dy),
  };
  shapes.doc?.transact(() => {
    shapes.delete(idx, 1);
    shapes.insert(idx, [updated]);
  });
}
