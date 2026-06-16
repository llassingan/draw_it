import { describe, expect, it } from 'vitest';

import { clearCanvas, renderShapes } from './renderer';
import type { CircleShape, PenStroke, RectShape, Shape, TriangleShape } from '@whiteboard/shared';

function makeMockContext(): {
  ctx: CanvasRenderingContext2D;
  calls: { method: string; args: unknown[] }[];
  writes: Record<string, unknown>;
} {
  const calls: { method: string; args: unknown[] }[] = [];
  const writes: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (target, prop) => {
      if (typeof prop === 'string' && prop in target) {
        return Reflect.get(target, prop);
      }
      if (typeof prop === 'string') {
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
        };
      }
      return undefined;
    },
    set: (target, prop, value) => {
      if (typeof prop === 'string') {
        writes[prop] = value;
        Reflect.set(target, prop, value);
      }
      return true;
    },
  };
  return {
    ctx: new Proxy({}, handler) as unknown as CanvasRenderingContext2D,
    calls,
    writes,
  };
}

describe('clearCanvas', () => {
  it('fills the canvas with the background color', () => {
    const { ctx, calls, writes } = makeMockContext();
    clearCanvas(ctx, 100, 50);
    expect(writes['fillStyle']).toBe('#ffffff');
    const fillRect = calls.find((c) => c.method === 'fillRect');
    expect(fillRect).toBeDefined();
    expect(fillRect?.args).toEqual([0, 0, 100, 50]);
  });
});

const pen: PenStroke = {
  id: 'p1',
  type: 'pen',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#0f0',
  width: 3,
  points: [10, 10, 50, 50, 100, 30],
};

const rect: RectShape = {
  id: 'r1',
  type: 'rect',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#f00',
  width: 2,
  start: { x: 0, y: 0 },
  end: { x: 100, y: 100 },
};

const triangle: TriangleShape = {
  id: 't1',
  type: 'triangle',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#00f',
  width: 4,
  a: { x: 0, y: 100 },
  b: { x: 100, y: 100 },
  c: { x: 50, y: 0 },
};

const circle: CircleShape = {
  id: 'c1',
  type: 'circle',
  authorId: 'a',
  authorColor: '#000',
  createdAt: 0,
  color: '#ff0',
  width: 2,
  center: { x: 50, y: 50 },
  radius: 40,
};

describe('renderShapes', () => {
  it('renders a pen stroke with multiple points', () => {
    const { ctx, calls } = makeMockContext();
    renderShapes(ctx, [pen]);
    expect(calls.find((c) => c.method === 'beginPath')).toBeDefined();
    expect(calls.find((c) => c.method === 'moveTo')).toBeDefined();
    expect(calls.find((c) => c.method === 'lineTo')).toBeDefined();
    expect(calls.find((c) => c.method === 'stroke')).toBeDefined();
  });

  it('renders a rect using strokeRect', () => {
    const { ctx, calls } = makeMockContext();
    renderShapes(ctx, [rect]);
    const strokeRect = calls.find((c) => c.method === 'strokeRect');
    expect(strokeRect).toBeDefined();
    expect(strokeRect?.args).toEqual([0, 0, 100, 100]);
  });

  it('skips a pen with fewer than 2 points', () => {
    const { ctx, calls } = makeMockContext();
    renderShapes(ctx, [{ ...pen, points: [10] }]);
    expect(calls.find((c) => c.method === 'beginPath')).toBeUndefined();
  });

  it('handles inverted rect drag direction (end < start)', () => {
    const { ctx, calls } = makeMockContext();
    renderShapes(ctx, [{ ...rect, start: { x: 200, y: 200 }, end: { x: 100, y: 100 } }]);
    expect(calls.find((c) => c.method === 'strokeRect')?.args).toEqual([100, 100, 100, 100]);
  });

  it('renders a triangle with three sides and a close', () => {
    const { ctx, calls } = makeMockContext();
    renderShapes(ctx, [triangle]);
    expect(calls.filter((c) => c.method === 'lineTo')).toHaveLength(2);
    expect(calls.find((c) => c.method === 'closePath')).toBeDefined();
    const moveTo = calls.find((c) => c.method === 'moveTo');
    expect(moveTo?.args).toEqual([0, 100]);
  });

  it('renders a circle using arc with full 2pi sweep', () => {
    const { ctx, calls } = makeMockContext();
    renderShapes(ctx, [circle]);
    const arc = calls.find((c) => c.method === 'arc');
    expect(arc).toBeDefined();
    expect(arc?.args).toEqual([50, 50, 40, 0, Math.PI * 2]);
  });

  it('renders a zero-radius circle as a tiny arc', () => {
    const { ctx, calls } = makeMockContext();
    renderShapes(ctx, [{ ...circle, radius: 0 }]);
    const arc = calls.find((c) => c.method === 'arc');
    expect(arc?.args).toEqual([50, 50, 0, 0, Math.PI * 2]);
  });

  it('sets lineCap and lineJoin to round', () => {
    const { ctx, writes } = makeMockContext();
    renderShapes(ctx, []);
    expect(writes['lineCap']).toBe('round');
    expect(writes['lineJoin']).toBe('round');
  });

  it('does not throw on empty shape list', () => {
    const { ctx } = makeMockContext();
    expect(() => renderShapes(ctx, [])).not.toThrow();
  });

  it('dispatches all four shape types in one call', () => {
    const { ctx, calls } = makeMockContext();
    const all: Shape[] = [pen, rect, triangle, circle];
    renderShapes(ctx, all);
    expect(calls.find((c) => c.method === 'beginPath')).toBeDefined();
    expect(calls.find((c) => c.method === 'strokeRect')).toBeDefined();
    expect(calls.find((c) => c.method === 'closePath')).toBeDefined();
    expect(calls.find((c) => c.method === 'arc')).toBeDefined();
  });
});
