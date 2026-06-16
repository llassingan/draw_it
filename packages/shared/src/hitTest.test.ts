import { describe, expect, it } from 'vitest';

import { hitTest, hitTestAll } from './hitTest';
import type { CircleShape, PenStroke, Point, RectShape, TriangleShape } from './shapes';

const point: Point = { x: 50, y: 50 };

const makePen = (overrides: Partial<PenStroke> = {}): PenStroke => ({
  id: 'p1',
  type: 'pen',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#000',
  width: 4,
  points: [0, 0, 100, 100],
  ...overrides,
});

const makeRect = (overrides: Partial<RectShape> = {}): RectShape => ({
  id: 'r1',
  type: 'rect',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#000',
  width: 2,
  start: { x: 0, y: 0 },
  end: { x: 100, y: 100 },
  ...overrides,
});

const makeTriangle = (overrides: Partial<TriangleShape> = {}): TriangleShape => ({
  id: 't1',
  type: 'triangle',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#000',
  width: 2,
  a: { x: 0, y: 0 },
  b: { x: 100, y: 0 },
  c: { x: 50, y: 100 },
  ...overrides,
});

const makeCircle = (overrides: Partial<CircleShape> = {}): CircleShape => ({
  id: 'c1',
  type: 'circle',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#000',
  width: 2,
  center: { x: 50, y: 50 },
  radius: 40,
  ...overrides,
});

describe('hitTest pen', () => {
  it('hits a point on the stroke', () => {
    expect(hitTest({ x: 50, y: 50 }, makePen({ points: [0, 0, 100, 100] }))).toBe(true);
  });

  it('hits a point near a vertex within tolerance', () => {
    expect(hitTest({ x: 1, y: 1 }, makePen({ width: 2, points: [0, 0, 100, 100] }))).toBe(true);
  });

  it('misses a point far from the stroke', () => {
    expect(hitTest({ x: 200, y: 200 }, makePen({ points: [0, 0, 100, 100] }))).toBe(false);
  });

  it('returns false for a degenerate pen (<2 points)', () => {
    expect(hitTest(point, makePen({ points: [0] }))).toBe(false);
  });

  it('rejects a thin stroke outside its width + tolerance', () => {
    expect(hitTest({ x: 50, y: 10 }, makePen({ width: 1, points: [0, 0, 100, 0] }))).toBe(false);
  });
});

describe('hitTest rect', () => {
  it('hits a point inside', () => {
    expect(hitTest({ x: 50, y: 50 }, makeRect())).toBe(true);
  });

  it('hits a point on the edge within tolerance', () => {
    expect(hitTest({ x: 0, y: 50 }, makeRect({ width: 4 }))).toBe(true);
  });

  it('misses a point outside the bounding box', () => {
    expect(hitTest({ x: 200, y: 200 }, makeRect())).toBe(false);
  });

  it('works for inverted start/end (drag in any direction)', () => {
    expect(hitTest({ x: 50, y: 50 }, makeRect({ start: { x: 100, y: 100 }, end: { x: 0, y: 0 } }))).toBe(true);
  });
});

describe('hitTest triangle', () => {
  it('hits a point strictly inside the triangle', () => {
    expect(hitTest({ x: 50, y: 40 }, makeTriangle())).toBe(true);
  });

  it('hits a point on an edge within tolerance', () => {
    expect(hitTest({ x: 50, y: 0 }, makeTriangle({ width: 4 }))).toBe(true);
  });

  it('misses a point outside the triangle', () => {
    expect(hitTest({ x: 50, y: 110 }, makeTriangle())).toBe(false);
    expect(hitTest({ x: -10, y: 50 }, makeTriangle())).toBe(false);
  });

  it('tolerates a thin triangle near the edge (within HIT_TOLERANCE_PX)', () => {
    expect(hitTest({ x: 50, y: 0 }, makeTriangle({ width: 1 }))).toBe(true);
    expect(hitTest({ x: 50, y: 3 }, makeTriangle({ width: 1 }))).toBe(true);
  });

  it('misses a point well outside the thin triangle', () => {
    expect(hitTest({ x: 200, y: 50 }, makeTriangle({ width: 1 }))).toBe(false);
    expect(hitTest({ x: -50, y: 50 }, makeTriangle({ width: 1 }))).toBe(false);
  });
});

describe('hitTest circle', () => {
  it('hits a point inside the circle', () => {
    expect(hitTest({ x: 50, y: 50 }, makeCircle())).toBe(true);
  });

  it('hits a point just inside the radius', () => {
    expect(hitTest({ x: 50, y: 88 }, makeCircle({ radius: 40 }))).toBe(true);
  });

  it('misses a point outside the radius', () => {
    expect(hitTest({ x: 50, y: 200 }, makeCircle())).toBe(false);
  });

  it('tolerates a thin circle just inside the edge', () => {
    expect(hitTest({ x: 50, y: 50 + 40 }, makeCircle({ radius: 40, width: 1 }))).toBe(true);
  });

  it('misses a point well outside a thin circle', () => {
    expect(hitTest({ x: 50, y: 50 + 50 }, makeCircle({ radius: 40, width: 1 }))).toBe(false);
  });

  it('handles a zero-radius circle (point only) with tolerance', () => {
    expect(hitTest({ x: 50, y: 50 }, makeCircle({ radius: 0 }))).toBe(true);
    expect(hitTest({ x: 53, y: 50 }, makeCircle({ radius: 0 }))).toBe(true);
  });

  it('misses a point well outside a zero-radius circle', () => {
    expect(hitTest({ x: 60, y: 50 }, makeCircle({ radius: 0 }))).toBe(false);
  });
});

describe('hitTestAll', () => {
  it('returns matching indices in z-order', () => {
    const shapes = [
      makePen(),
      makeRect(),
      makeTriangle(),
      makeCircle({ center: { x: 50, y: 50 } }),
    ];
    expect(hitTestAll({ x: 50, y: 50 }, shapes)).toEqual([0, 1, 2, 3]);
  });

  it('returns empty array when no shape matches', () => {
    expect(hitTestAll({ x: 1000, y: 1000 }, [makePen({ points: [0, 0, 10, 10] })])).toEqual([]);
  });

  it('skips undefined entries safely', () => {
    expect(hitTestAll({ x: 0, y: 0 }, [makePen({ points: [0, 0, 10, 10] })])).toEqual([0]);
  });
});
