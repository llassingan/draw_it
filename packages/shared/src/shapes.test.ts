import { describe, expect, it } from 'vitest';

import {
  generateShapeId,
  isCircleShape,
  isPenStroke,
  isRectShape,
  isShape,
  isTool,
  isTriangleShape,
  validateShape,
  type CircleShape,
  type PenStroke,
  type RectShape,
  type TriangleShape,
} from './shapes';

const baseFields = {
  id: 'shape-1',
  authorId: 'user-1',
  authorColor: '#000',
  createdAt: 1700000000000,
};

const pen: PenStroke = {
  ...baseFields,
  type: 'pen',
  color: '#f00',
  width: 2,
  points: [0, 0, 10, 10, 20, 20],
};

const rect: RectShape = {
  ...baseFields,
  id: 'shape-2',
  type: 'rect',
  color: '#0f0',
  width: 2,
  start: { x: 0, y: 0 },
  end: { x: 10, y: 10 },
};

const triangle: TriangleShape = {
  ...baseFields,
  id: 'shape-3',
  type: 'triangle',
  color: '#00f',
  width: 2,
  a: { x: 0, y: 0 },
  b: { x: 100, y: 0 },
  c: { x: 50, y: 100 },
};

const circle: CircleShape = {
  ...baseFields,
  id: 'shape-4',
  type: 'circle',
  color: '#ff0',
  width: 2,
  center: { x: 50, y: 50 },
  radius: 40,
};

describe('isPenStroke / isRectShape / isTriangleShape / isCircleShape / isShape / isTool', () => {
  it('isPenStroke returns true for pens only', () => {
    expect(isPenStroke(pen)).toBe(true);
    expect(isPenStroke(rect)).toBe(false);
    expect(isPenStroke(triangle)).toBe(false);
    expect(isPenStroke(circle)).toBe(false);
  });

  it('isRectShape returns true for rects only', () => {
    expect(isRectShape(rect)).toBe(true);
    expect(isRectShape(pen)).toBe(false);
  });

  it('isTriangleShape returns true for triangles only', () => {
    expect(isTriangleShape(triangle)).toBe(true);
    expect(isTriangleShape(rect)).toBe(false);
  });

  it('isCircleShape returns true for circles only', () => {
    expect(isCircleShape(circle)).toBe(true);
    expect(isCircleShape(triangle)).toBe(false);
  });

  it('isShape accepts all four valid shape types', () => {
    expect(isShape(pen)).toBe(true);
    expect(isShape(rect)).toBe(true);
    expect(isShape(triangle)).toBe(true);
    expect(isShape(circle)).toBe(true);
  });

  it('isShape rejects malformed values', () => {
    expect(isShape(null)).toBe(false);
    expect(isShape(undefined)).toBe(false);
    expect(isShape('not a shape')).toBe(false);
    expect(isShape({ type: 'unknown' })).toBe(false);
  });

  it('isTool accepts all known tool values', () => {
    expect(isTool('pen')).toBe(true);
    expect(isTool('rect')).toBe(true);
    expect(isTool('triangle')).toBe(true);
    expect(isTool('circle')).toBe(true);
    expect(isTool('eraser')).toBe(true);
    expect(isTool('select')).toBe(true);
    expect(isTool('pencil')).toBe(false);
    expect(isTool(null)).toBe(false);
    expect(isTool(0)).toBe(false);
  });
});

describe('validateShape', () => {
  it('returns null for null and non-objects', () => {
    expect(validateShape(null)).toBeNull();
    expect(validateShape(undefined)).toBeNull();
    expect(validateShape('string')).toBeNull();
    expect(validateShape(42)).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(validateShape({ type: 'star', ...baseFields })).toBeNull();
  });

  it('returns a PenStroke for valid input', () => {
    expect(validateShape(pen)).toEqual(pen);
  });

  it('rejects a pen with too few points', () => {
    expect(validateShape({ ...pen, points: [0] })).toBeNull();
    expect(validateShape({ ...pen, points: [0, 0, 10] })).toBeNull();
  });

  it('rejects a pen with non-finite points', () => {
    expect(validateShape({ ...pen, points: [0, 0, Number.NaN, 5] })).toBeNull();
  });

  it('rejects a pen with non-positive width', () => {
    expect(validateShape({ ...pen, width: 0 })).toBeNull();
    expect(validateShape({ ...pen, width: -1 })).toBeNull();
  });

  it('returns a RectShape for valid input', () => {
    expect(validateShape(rect)).toEqual(rect);
  });

  it('rejects a rect with missing start/end', () => {
    expect(validateShape({ ...rect, start: { x: 0 } })).toBeNull();
    expect(validateShape({ ...rect, end: null })).toBeNull();
  });

  it('returns a TriangleShape for valid input', () => {
    expect(validateShape(triangle)).toEqual(triangle);
  });

  it('rejects a triangle with missing vertex', () => {
    expect(validateShape({ ...triangle, a: { x: 0 } })).toBeNull();
    expect(validateShape({ ...triangle, c: null })).toBeNull();
  });

  it('returns a CircleShape for valid input', () => {
    expect(validateShape(circle)).toEqual(circle);
  });

  it('rejects a circle with negative radius', () => {
    expect(validateShape({ ...circle, radius: -1 })).toBeNull();
  });

  it('rejects a circle with missing center', () => {
    expect(validateShape({ ...circle, center: { x: 0 } })).toBeNull();
  });

  it('rejects shapes missing base fields', () => {
    const { id: _omit, ...noId } = pen;
    void _omit;
    expect(validateShape(noId)).toBeNull();
  });
});

describe('generateShapeId', () => {
  it('returns a non-empty string', () => {
    expect(generateShapeId().length).toBeGreaterThan(0);
  });

  it('returns different ids on subsequent calls', () => {
    const a = generateShapeId();
    const b = generateShapeId();
    expect(a).not.toBe(b);
  });
});
