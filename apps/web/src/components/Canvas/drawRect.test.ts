import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import type { Shape } from '@whiteboard/shared';

import { startRect, updateRect } from './drawRect';

function newDoc(): { doc: Y.Doc; shapes: Y.Array<Shape> } {
  const doc = new Y.Doc();
  const shapes = doc.getArray<Shape>('shapes');
  return { doc, shapes };
}

describe('startRect', () => {
  it('pushes a zero-size rect', () => {
    const { shapes } = newDoc();
    const rect = startRect(shapes, 'u', '#000', { x: 10, y: 20 }, '#f00', 2);
    expect(shapes.length).toBe(1);
    expect(rect.type).toBe('rect');
    expect(rect.start).toEqual({ x: 10, y: 20 });
    expect(rect.end).toEqual({ x: 10, y: 20 });
  });
});

describe('updateRect', () => {
  it('updates the end point of a rect', () => {
    const { shapes } = newDoc();
    const rect = startRect(shapes, 'u', '#000', { x: 10, y: 10 }, '#000', 2);
    updateRect(shapes, rect.id, { x: 100, y: 200 });
    const stored = shapes.get(0);
    if (stored?.type === 'rect') {
      expect(stored.end).toEqual({ x: 100, y: 200 });
      expect(stored.start).toEqual({ x: 10, y: 10 });
    } else {
      throw new Error('rect not stored');
    }
  });

  it('is a no-op for an unknown id', () => {
    const { shapes } = newDoc();
    startRect(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateRect(shapes, 'does-not-exist', { x: 50, y: 50 });
    expect(shapes.length).toBe(1);
  });
});
