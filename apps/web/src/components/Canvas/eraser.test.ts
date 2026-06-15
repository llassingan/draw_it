import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import type { Shape } from '@whiteboard/shared';

import { eraseAtPoint } from './eraser';
import { startPenStroke } from './drawPen';
import { startRect } from './drawRect';

function newDoc(): { doc: Y.Doc; shapes: Y.Array<Shape> } {
  const doc = new Y.Doc();
  const shapes = doc.getArray<Shape>('shapes');
  return { doc, shapes };
}

describe('eraseAtPoint', () => {
  it('removes the shape under the pointer', () => {
    const { shapes } = newDoc();
    const rect = startRect(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateRect(shapes, rect.id, { x: 100, y: 100 });
    expect(shapes.length).toBe(1);
    eraseAtPoint(shapes, { x: 50, y: 50 });
    expect(shapes.length).toBe(0);
  });

  it('removes only the top-most shape when multiple overlap', () => {
    const { shapes } = newDoc();
    const r1 = startRect(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateRect(shapes, r1.id, { x: 100, y: 100 });
    const r2 = startRect(shapes, 'u', '#000', { x: 10, y: 10 }, '#f00', 4);
    updateRect(shapes, r2.id, { x: 90, y: 90 });
    expect(shapes.length).toBe(2);
    eraseAtPoint(shapes, { x: 50, y: 50 });
    expect(shapes.length).toBe(1);
    const remaining = shapes.get(0);
    expect(remaining?.id).toBe(r1.id);
  });

  it('erases a pen stroke under the pointer', () => {
    const { shapes } = newDoc();
    startPenStroke(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    expect(shapes.length).toBe(1);
    eraseAtPoint(shapes, { x: 0, y: 0 });
    expect(shapes.length).toBe(0);
  });

  it('is a no-op when nothing is under the pointer', () => {
    const { shapes } = newDoc();
    startRect(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    eraseAtPoint(shapes, { x: 1000, y: 1000 });
    expect(shapes.length).toBe(1);
  });
});

function updateRect(
  shapes: Y.Array<Shape>,
  rectId: string,
  end: { x: number; y: number },
): void {
  const arr = shapes.toArray();
  const idx = arr.findIndex((s) => s.id === rectId);
  if (idx === -1) return;
  const rect = arr[idx];
  if (rect === undefined || rect.type !== 'rect') return;
  const updated = { ...rect, end };
  shapes.doc?.transact(() => {
    shapes.delete(idx, 1);
    shapes.insert(idx, [updated]);
  });
}
