/**
 * Pen tool — creates and extends PenStroke shapes in the Yjs Y.Array.
 *
 * `startPenStroke` creates a new stroke with a single point and pushes
 * it to the Y.Array (Yjs syncs this to all peers).
 *
 * `extendPenStroke` finds the existing stroke by ID, appends the new
 * point, then replaces the element inside a Yjs transaction via
 * `delete(idx, 1)` + `insert(idx, [updated])`. This replace pattern is
 * required because Yjs cannot mutate individual array elements — you must
 * delete and re-insert with the updated value.
 *
 * Duplicate points (same as the last point) are skipped to avoid
 * unnecessary Yjs updates and wasted CRDT operations.
 */

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
  // Push the new stroke to the shared Y.Array — synced to all peers.
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
  // Skip if the new point is identical to the last point in the stroke.
  const lastX = stroke.points[stroke.points.length - 2];
  const lastY = stroke.points[stroke.points.length - 1];
  if (lastX === point.x && lastY === point.y) return;
  const updated: PenStroke = {
    ...stroke,
    points: [...stroke.points, point.x, point.y],
  };
  // Yjs replace pattern: delete old element, insert updated one in the
  // same position, all within a single transaction.
  shapes.doc?.transact(() => {
    shapes.delete(idx, 1);
    shapes.insert(idx, [updated]);
  });
}
