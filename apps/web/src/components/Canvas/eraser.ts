
import { hitTestAll } from '@whiteboard/shared';
import type { Point, Shape } from '@whiteboard/shared';
import type * as Y from 'yjs';

export function eraseAtPoint(shapes: Y.Array<Shape>, point: Point): void {
  const all = shapes.toArray();
  const hits = hitTestAll(point, all);
  if (hits.length === 0) return;
  const topMost = hits[hits.length - 1];
  if (topMost === undefined) return;
  shapes.doc?.transact(() => {
    shapes.delete(topMost, 1);
  });
}
