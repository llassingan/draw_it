
import { generateShapeId, isPenStroke } from '@whiteboard/shared';
import type { PenStroke, Point, Shape } from '@whiteboard/shared';
import type * as Y from 'yjs';

export function startPenStroke(
  shapes: Y.Array<Shape>,
  authorId: string,
  authorColor: string,
  point: Point,
  color: string,
  width: number,
): PenStroke {
  const stroke: PenStroke = {
    id: generateShapeId(),
    type: 'pen',
    authorId,
    authorColor,
    createdAt: Date.now(),
    color,
    width,
    points: [point.x, point.y],
  };
  shapes.push([stroke]);
  return stroke;
}

export function extendPenStroke(
  shapes: Y.Array<Shape>,
  strokeId: string,
  point: Point,
): void {
  const arr = shapes.toArray();
  const idx = arr.findIndex((s) => s.id === strokeId);
  if (idx === -1) return;
  const stroke = arr[idx];
  if (stroke === undefined || !isPenStroke(stroke)) return;
  const lastX = stroke.points[stroke.points.length - 2];
  const lastY = stroke.points[stroke.points.length - 1];
  if (lastX === point.x && lastY === point.y) return;
  const updated: PenStroke = {
    ...stroke,
    points: [...stroke.points, point.x, point.y],
  };
  shapes.doc?.transact(() => {
    shapes.delete(idx, 1);
    shapes.insert(idx, [updated]);
  });
}
