import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import type { Shape } from '@whiteboard/shared';

import { startCircle, updateCircle } from './drawCircle';

function newDoc(): { doc: Y.Doc; shapes: Y.Array<Shape> } {
  const doc = new Y.Doc();
  const shapes = doc.getArray<Shape>('shapes');
  return { doc, shapes };
}

describe('startCircle', () => {
  it('pushes a zero-radius circle at the pointer', () => {
    const { shapes } = newDoc();
    const c = startCircle(shapes, 'u', '#000', { x: 50, y: 50 }, '#f00', 2);
    expect(shapes.length).toBe(1);
    expect(c.type).toBe('circle');
    expect(c.center).toEqual({ x: 50, y: 50 });
    expect(c.radius).toBe(0);
  });
});

describe('updateCircle', () => {
  it('updates the radius as the distance from center to the drag point', () => {
    const { shapes } = newDoc();
    const c = startCircle(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateCircle(shapes, c.id, { x: 30, y: 40 });
    const stored = shapes.get(0);
    if (stored?.type === 'circle') {
      expect(stored.center).toEqual({ x: 0, y: 0 });
      expect(stored.radius).toBe(50);
    } else {
      throw new Error('circle not stored');
    }
  });

  it('produces the same radius when the drag is in any direction', () => {
    const { shapes } = newDoc();
    const c = startCircle(shapes, 'u', '#000', { x: 10, y: 10 }, '#000', 2);
    updateCircle(shapes, c.id, { x: 110, y: 10 });
    const first = shapes.get(0);
    if (first?.type === 'circle') expect(first.radius).toBe(100);
    updateCircle(shapes, c.id, { x: 10, y: -90 });
    const second = shapes.get(0);
    if (second?.type === 'circle') expect(second.radius).toBe(100);
  });

  it('is a no-op for an unknown id', () => {
    const { shapes } = newDoc();
    startCircle(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateCircle(shapes, 'does-not-exist', { x: 50, y: 50 });
    expect(shapes.length).toBe(1);
  });
});
