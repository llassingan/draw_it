/**
 * Shape type system for the collaborative whiteboard.
 *
 * All shapes are synced via Yjs CRDT over WebSocket. The `type` field acts as
 * a discriminated union tag, enabling TypeScript to narrow `Shape` to a
 * specific variant after a type-guard check (e.g. `isPenStroke`).
 *
 * ## Why `points` is a flat array
 *
 * `PenStroke.points` stores coordinates as `[x0, y0, x1, y1, ...]` instead of
 * `[{x, y}, ...]`. Flat arrays are more efficient for Yjs CRDT syncing
 * because each element is a primitive that Yjs can diff individually. Nested
 * objects require Yjs to deep-compare and patch sub-trees, which adds overhead
 * on every keystroke of a pen stroke.
 */

export type ShapeId = string;

export type Tool = 'pen' | 'rect' | 'triangle' | 'circle' | 'eraser' | 'select' | 'pan';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Fields common to every shape. */
export interface BaseShape {
  id: ShapeId;
  authorId: string;
  authorColor: string;
  createdAt: number;
}

/** Freehand drawing stored as a flat coordinate array for Yjs CRDT efficiency. */
export interface PenStroke extends BaseShape {
  type: 'pen';
  color: string;
  width: number;
  points: number[]; // flat [x0, y0, x1, y1, ...] — see module header
}

export interface RectShape extends BaseShape {
  type: 'rect';
  color: string;
  width: number;
  start: Point;
  end: Point;
}

/**
 * `a` and `b` are the two base vertices; `c` is the apex (always above the
 * base in the coordinate system used at creation time).
 */
export interface TriangleShape extends BaseShape {
  type: 'triangle';
  color: string;
  width: number;
  a: Point;
  b: Point;
  c: Point;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  color: string;
  width: number;
  center: Point;
  radius: number;
}

/**
 * Discriminated union of all shape types.
 * The `type` field is the discriminator — checking it narrows the union
 * to the concrete shape interface.
 */
export type Shape = PenStroke | RectShape | TriangleShape | CircleShape;

/** Extracts the literal type of the discriminator field. */
export type ShapeType = Shape['type'];

// ---- Type guards: narrow `Shape` to a concrete variant at runtime ----

/** Returns `true` if the shape is a freehand pen stroke. */
export const isPenStroke = (shape: Shape): shape is PenStroke =>
  shape.type === 'pen';

export const isRectShape = (shape: Shape): shape is RectShape =>
  shape.type === 'rect';

export const isTriangleShape = (shape: Shape): shape is TriangleShape =>
  shape.type === 'triangle';

export const isCircleShape = (shape: Shape): shape is CircleShape =>
  shape.type === 'circle';

/**
 * Lightweight duck-type check: returns `true` if `value` looks like a `Shape`
 * based solely on the `type` discriminator. Does NOT validate nested fields.
 * For full validation of untrusted data, use `validateShape` instead.
 */
export const isShape = (value: unknown): value is Shape => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const t = candidate['type'];
  return t === 'pen' || t === 'rect' || t === 'triangle' || t === 'circle';
};

/** Returns `true` if `value` is a recognized tool identifier. */
export const isTool = (value: unknown): value is Tool => {
  return (
    value === 'pen' ||
    value === 'rect' ||
    value === 'triangle' ||
    value === 'circle' ||
    value === 'eraser' ||
    value === 'select' ||
    value === 'pan'
  );
};

// ---- Internal validation helpers ----

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isPoint(value: unknown): value is Point {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return isFiniteNumber(p['x']) && isFiniteNumber(p['y']);
}

/** Validates the four fields that every shape must carry. */
function isBaseShape(value: object): value is BaseShape {
  const base = value as Record<string, unknown>;
  return (
    isNonEmptyString(base['id']) &&
    isNonEmptyString(base['authorId']) &&
    isNonEmptyString(base['authorColor']) &&
    isFiniteNumber(base['createdAt'])
  );
}

// ---- Per-shape validators: full runtime validation of all fields ----

function validatePenStroke(value: object): PenStroke | null {
  const candidate = value as Record<string, unknown>;
  if (!isBaseShape(candidate)) return null;
  if (candidate['type'] !== 'pen') return null;
  if (!isNonEmptyString(candidate['color'])) return null;
  if (!isFiniteNumber(candidate['width']) || candidate['width'] <= 0) return null;
  if (!Array.isArray(candidate['points'])) return null;
  const points = candidate['points'];
  // Must have at least one (x,y) pair and an even number of entries.
  if (points.length < 2 || points.length % 2 !== 0) return null;
  for (const n of points) {
    if (!isFiniteNumber(n)) return null;
  }
  return {
    id: candidate['id'],
    authorId: candidate['authorId'],
    authorColor: candidate['authorColor'],
    createdAt: candidate['createdAt'],
    type: 'pen',
    color: candidate['color'],
    width: candidate['width'],
    points: points as number[],
  };
}

function validateRectShape(value: object): RectShape | null {
  const candidate = value as Record<string, unknown>;
  if (!isBaseShape(candidate)) return null;
  if (candidate['type'] !== 'rect') return null;
  if (!isNonEmptyString(candidate['color'])) return null;
  if (!isFiniteNumber(candidate['width']) || candidate['width'] <= 0) return null;
  if (!isPoint(candidate['start']) || !isPoint(candidate['end'])) return null;
  return {
    id: candidate['id'],
    authorId: candidate['authorId'],
    authorColor: candidate['authorColor'],
    createdAt: candidate['createdAt'],
    type: 'rect',
    color: candidate['color'],
    width: candidate['width'],
    start: candidate['start'],
    end: candidate['end'],
  };
}

function validateTriangleShape(value: object): TriangleShape | null {
  const candidate = value as Record<string, unknown>;
  if (!isBaseShape(candidate)) return null;
  if (candidate['type'] !== 'triangle') return null;
  if (!isNonEmptyString(candidate['color'])) return null;
  if (!isFiniteNumber(candidate['width']) || candidate['width'] <= 0) return null;
  if (!isPoint(candidate['a']) || !isPoint(candidate['b']) || !isPoint(candidate['c'])) {
    return null;
  }
  return {
    id: candidate['id'],
    authorId: candidate['authorId'],
    authorColor: candidate['authorColor'],
    createdAt: candidate['createdAt'],
    type: 'triangle',
    color: candidate['color'],
    width: candidate['width'],
    a: candidate['a'],
    b: candidate['b'],
    c: candidate['c'],
  };
}

function validateCircleShape(value: object): CircleShape | null {
  const candidate = value as Record<string, unknown>;
  if (!isBaseShape(candidate)) return null;
  if (candidate['type'] !== 'circle') return null;
  if (!isNonEmptyString(candidate['color'])) return null;
  if (!isFiniteNumber(candidate['width']) || candidate['width'] <= 0) return null;
  if (!isPoint(candidate['center'])) return null;
  if (!isFiniteNumber(candidate['radius']) || candidate['radius'] < 0) return null;
  return {
    id: candidate['id'],
    authorId: candidate['authorId'],
    authorColor: candidate['authorColor'],
    createdAt: candidate['createdAt'],
    type: 'circle',
    color: candidate['color'],
    width: candidate['width'],
    center: candidate['center'],
    radius: candidate['radius'],
  };
}

/**
 * Full runtime validation for data arriving from the network (Yjs sync).
 *
 * Unlike `isShape` (quick duck-type check), this validates every field
 * recursively and returns a fully typed `Shape` or `null`. Use when consuming
 * shapes that may have been corrupted during serialization or constructed by
 * an untrusted client.
 */
export function validateShape(input: unknown): Shape | null {
  if (typeof input !== 'object' || input === null) return null;
  const value = input as Record<string, unknown>;
  if (value['type'] === 'pen') return validatePenStroke(value);
  if (value['type'] === 'rect') return validateRectShape(value);
  if (value['type'] === 'triangle') return validateTriangleShape(value);
  if (value['type'] === 'circle') return validateCircleShape(value);
  return null;
}

/**
 * Generates a unique shape identifier.
 *
 * Prefers `crypto.randomUUID()` when available (modern browsers, Node 19+),
 * falling back to a base-36 timestamp + random suffix for older runtimes.
 */
export function generateShapeId(): ShapeId {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
