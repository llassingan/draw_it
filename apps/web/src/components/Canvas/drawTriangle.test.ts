import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import type { Shape } from '@whiteboard/shared';

import { startTriangle, updateTriangle } from './drawTriangle';

function newDoc(): { doc: Y.Doc; shapes: Y.Array<Shape> } {
  const doc = new Y.Doc();
  const shapes = doc.getArray<Shape>('shapes');
  return { doc, shapes };
}

describe('startTriangle', () => {
  it('pushes a degenerate triangle (all three vertices at the pointer)', () => {
    const { shapes } = newDoc();
    const tri = startTriangle(shapes, 'u', '#000', { x: 10, y: 20 }, '#f00', 2);
    expect(shapes.length).toBe(1);
    expect(tri.type).toBe('triangle');
    expect(tri.a).toEqual({ x: 10, y: 20 });
    expect(tri.b).toEqual({ x: 10, y: 20 });
    expect(tri.c).toEqual({ x: 10, y: 20 });
  });
});

describe('updateTriangle', () => {
  it('updates b to the end point and places the apex above the base', () => {
    const { shapes } = newDoc();
    const tri = startTriangle(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateTriangle(shapes, tri.id, { x: 100, y: 0 });
    const stored = shapes.get(0);
    if (stored?.type === 'triangle') {
      expect(stored.a).toEqual({ x: 0, y: 0 });
      expect(stored.b).toEqual({ x: 100, y: 0 });
      const expectedApexX = 50;
      const expectedApexY = -(100 * Math.sqrt(3)) / 2;
      expect(stored.c.x).toBeCloseTo(expectedApexX, 5);
      expect(stored.c.y).toBeCloseTo(expectedApexY, 5);
    } else {
      throw new Error('triangle not stored');
    }
  });

  it('always places the apex above the base (apex y < base y) regardless of drag direction', () => {
    const { shapes } = newDoc();
    const tri = startTriangle(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateTriangle(shapes, tri.id, { x: 0, y: 100 });
    const stored = shapes.get(0);
    if (stored?.type === 'triangle') {
      expect(stored.a).toEqual({ x: 0, y: 0 });
      expect(stored.b).toEqual({ x: 0, y: 100 });
      expect(stored.c.x).toBeCloseTo(0, 5);
      expect(stored.c.y).toBeCloseTo(50 - (100 * Math.sqrt(3)) / 2, 5);
    } else {
      throw new Error('triangle not stored');
    }
  });

  it('is a no-op for an unknown id', () => {
    const { shapes } = newDoc();
    startTriangle(shapes, 'u', '#000', { x: 0, y: 0 }, '#000', 2);
    updateTriangle(shapes, 'does-not-exist', { x: 50, y: 50 });
    expect(shapes.length).toBe(1);
  });
});
