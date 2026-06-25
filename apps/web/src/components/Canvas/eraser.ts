/**
 * Eraser tool — removes the topmost shape at a given point.
 *
 * `eraseAtPoint` snapshots the shapes array, runs `hitTestAll` to find
 * every shape the point intersects, takes the LAST match (topmost in
 * z-order / paint order), and deletes it from the Y.Array inside a
 * Yjs transaction. Deletion is a single `Y.Array.delete` — the CRDT
 * handles concurrent deletions automatically.
 */

import { hitTestAll } from '@whiteboard/shared';
import type { Point, Shape } from '@whiteboard/shared';
import type * as Y from 'yjs';

export function eraseAtPoint(shapes: Y.Array<Shape>, point: Point): void {
  const all = shapes.toArray();
  const hits = hitTestAll(point, all);
  if (hits.length === 0) return;
  // The last hit is the topmost shape in paint/z-order.
  const topMost = hits[hits.length - 1];
  if (topMost === undefined) return;
  shapes.doc?.transact(() => {
    shapes.delete(topMost, 1);
  });
}
