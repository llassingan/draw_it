/**
 * Rectangle tool — creates and updates RectShape in the Yjs Y.Array.
 *
 * `startRect` creates a zero-size rect at the pointer-down position
 * (start == end), effectively a point.
 *
 * `updateRect` expands the `end` point as the user drags, replacing the
 * existing rect inside a Yjs transaction via `delete(idx,1)` +
 * `insert(idx, [updated])` — the standard Yjs array replace pattern.
 */

import { generateShapeId, isRectShape } from '@whiteboard/shared';
import type { Point, RectShape, Shape } from '@whiteboard/shared';
import type * as Y from 'yjs';

export function startRect(
  shapes: Y.Array<Shape>,
  authorId: string,
  authorColor: string,
  point: Point,
  color: string,
  width: number,
): RectShape {
  const rect: RectShape = {
    id: generateShapeId(),
    type: 'rect',
    authorId,
    authorColor,
    createdAt: Date.now(),
    color,
    width,
    start: { x: point.x, y: point.y },
    end: { x: point.x, y: point.y },
  };
  shapes.push([rect]);
  return rect;
}

export function updateRect(
  shapes: Y.Array<Shape>,
  rectId: string,
  end: Point,
): void {
  const arr = shapes.toArray();
  const idx = arr.findIndex((s) => s.id === rectId);
  if (idx === -1) return;
  const rect = arr[idx];
  if (rect === undefined || !isRectShape(rect)) return;
  const updated: RectShape = {
    ...rect,
    end: { x: end.x, y: end.y },
  };
  // Replace the element inside a Yjs transaction so all peers see the update.
  shapes.doc?.transact(() => {
    shapes.delete(idx, 1);
    shapes.insert(idx, [updated]);
  });
}
