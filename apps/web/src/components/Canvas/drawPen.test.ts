import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import type { Shape } from '@whiteboard/shared';

import { startPenStroke, extendPenStroke } from './drawPen';

function newDoc(): { doc: Y.Doc; shapes: Y.Array<Shape> } {
  const doc = new Y.Doc();
  const shapes = doc.getArray<Shape>('shapes');
  return { doc, shapes };
}

describe('startPenStroke', () => {
  it('pushes a new stroke into the Y.Array', () => {
    const { shapes } = newDoc();
    const stroke = startPenStroke(shapes, 'user-1', '#000', { x: 10, y: 20 }, '#f00', 3);
    expect(shapes.length).toBe(1);
    expect(stroke.type).toBe('pen');
    expect(stroke.points).toEqual([10, 20]);
    expect(stroke.color).toBe('#f00');
    expect(stroke.width).toBe(3);
    expect(stroke.authorId).toBe('user-1');
  });
});

describe('extendPenStroke', () => {
  it('appends new points to an existing stroke', () => {
    const { shapes } = newDoc();
    const stroke = startPenStroke(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    expect(shapes.length).toBe(1);
    extendPenStroke(shapes, stroke.id, { x: 10, y: 10 });
    extendPenStroke(shapes, stroke.id, { x: 20, y: 20 });
    expect(shapes.length).toBe(1);
    const stored = shapes.get(0);
    expect(stored?.type).toBe('pen');
    if (stored?.type === 'pen') {
      expect(stored.points).toEqual([0, 0, 10, 10, 20, 20]);
    }
  });

  it('is a no-op for an unknown stroke id', () => {
    const { shapes } = newDoc();
    startPenStroke(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    extendPenStroke(shapes, 'does-not-exist', { x: 50, y: 50 });
    expect(shapes.length).toBe(1);
    const stored = shapes.get(0);
    if (stored?.type === 'pen') {
      expect(stored.points).toEqual([0, 0]);
    }
  });

  it('skips a duplicate point at the same coordinates', () => {
    const { shapes } = newDoc();
    const stroke = startPenStroke(shapes, 'u', '#000', { x: 5, y: 5 }, '#000', 2);
    extendPenStroke(shapes, stroke.id, { x: 5, y: 5 });
    expect(shapes.length).toBe(1);
    const stored = shapes.get(0);
    if (stored?.type === 'pen') {
      expect(stored.points).toEqual([5, 5]);
    }
  });
});
