import { describe, expect, it } from 'vitest';

import { hitTest, hitTestAll } from './hitTest';
import type { PenStroke, Point, RectShape } from './shapes';

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

describe('hitTest pen', () => {
  it('hits a point on the stroke', () => {
    const shape = makePen({ points: [0, 0, 100, 100] });
    expect(hitTest({ x: 50, y: 50 }, shape)).toBe(true);
  });

  it('hits a point near a vertex within tolerance', () => {
    const shape = makePen({ width: 2, points: [0, 0, 100, 100] });
    expect(hitTest({ x: 1, y: 1 }, shape)).toBe(true);
  });

  it('misses a point far from the stroke', () => {
    const shape = makePen({ points: [0, 0, 100, 100] });
    expect(hitTest({ x: 200, y: 200 }, shape)).toBe(false);
  });

  it('returns false for a degenerate pen (<2 points)', () => {
    const shape = makePen({ points: [0] });
    expect(hitTest(point, shape)).toBe(false);
  });

  it('rejects a thin stroke outside its width + tolerance', () => {
    const shape = makePen({ width: 1, points: [0, 0, 100, 0] });
    expect(hitTest({ x: 50, y: 10 }, shape)).toBe(false);
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
    const shape = makeRect({ start: { x: 100, y: 100 }, end: { x: 0, y: 0 } });
    expect(hitTest({ x: 50, y: 50 }, shape)).toBe(true);
  });
});

describe('hitTestAll', () => {
  it('returns matching indices in z-order', () => {
    const shapes = [makePen(), makeRect(), makePen({ id: 'p2', points: [10, 10, 20, 20] })];
    expect(hitTestAll({ x: 50, y: 50 }, shapes)).toEqual([0, 1]);
  });

  it('returns empty array when no shape matches', () => {
    const shapes = [makePen({ points: [0, 0, 10, 10] })];
    expect(hitTestAll({ x: 1000, y: 1000 }, shapes)).toEqual([]);
  });

  it('skips undefined entries safely', () => {
    const shapes: ReadonlyArray<PenStroke | RectShape> = [
      makePen({ points: [0, 0, 10, 10] }),
    ];
    expect(hitTestAll({ x: 0, y: 0 }, shapes)).toEqual([0]);
  });
});
