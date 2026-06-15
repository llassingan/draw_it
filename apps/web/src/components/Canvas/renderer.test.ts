import { describe, expect, it } from 'vitest';

import { clearCanvas, renderShapes } from './renderer';
import type { PenStroke, RectShape } from '@whiteboard/shared';

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

describe('renderShapes', () => {
  it('renders a pen stroke with multiple points', () => {
    const { ctx, calls } = makeMockContext();
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
    renderShapes(ctx, [pen]);
    expect(calls.find((c) => c.method === 'beginPath')).toBeDefined();
    expect(calls.find((c) => c.method === 'moveTo')).toBeDefined();
    expect(calls.find((c) => c.method === 'lineTo')).toBeDefined();
    expect(calls.find((c) => c.method === 'stroke')).toBeDefined();
  });

  it('renders a rect using strokeRect', () => {
    const { ctx, calls } = makeMockContext();
    const rect: RectShape = {
      id: 'r1',
      type: 'rect',
      authorId: 'a',
      authorColor: '#000',
      createdAt: 0,
      color: '#f00',
      width: 2,
      start: { x: 10, y: 20 },
      end: { x: 110, y: 220 },
    };
    renderShapes(ctx, [rect]);
    const strokeRect = calls.find((c) => c.method === 'strokeRect');
    expect(strokeRect).toBeDefined();
    expect(strokeRect?.args).toEqual([10, 20, 100, 200]);
  });

  it('skips a pen with fewer than 2 points', () => {
    const { ctx, calls } = makeMockContext();
    const pen: PenStroke = {
      id: 'p1',
      type: 'pen',
      authorId: 'a',
      authorColor: '#000',
      createdAt: 0,
      color: '#000',
      width: 2,
      points: [10],
    };
    renderShapes(ctx, [pen]);
    expect(calls.find((c) => c.method === 'beginPath')).toBeUndefined();
  });

  it('handles inverted rect drag direction (end < start)', () => {
    const { ctx, calls } = makeMockContext();
    const rect: RectShape = {
      id: 'r1',
      type: 'rect',
      authorId: 'a',
      authorColor: '#000',
      createdAt: 0,
      color: '#f00',
      width: 2,
      start: { x: 200, y: 200 },
      end: { x: 100, y: 100 },
    };
    renderShapes(ctx, [rect]);
    const strokeRect = calls.find((c) => c.method === 'strokeRect');
    expect(strokeRect?.args).toEqual([100, 100, 100, 100]);
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
});
