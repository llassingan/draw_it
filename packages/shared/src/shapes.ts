export type ShapeId = string;

export type Tool = 'pen' | 'rect' | 'eraser' | 'select';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface BaseShape {
  id: ShapeId;
  authorId: string;
  authorColor: string;
  createdAt: number;
}

export interface PenStroke extends BaseShape {
  type: 'pen';
  color: string;
  width: number;
  points: number[];
}

export interface RectShape extends BaseShape {
  type: 'rect';
  color: string;
  width: number;
  start: Point;
  end: Point;
}

export type Shape = PenStroke | RectShape;

export type ShapeType = Shape['type'];

export const isPenStroke = (shape: Shape): shape is PenStroke =>
  shape.type === 'pen';

export const isRectShape = (shape: Shape): shape is RectShape =>
  shape.type === 'rect';

export const isShape = (value: unknown): value is Shape => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate['type'] === 'pen' || candidate['type'] === 'rect';
};

export const isTool = (value: unknown): value is Tool => {
  return (
    value === 'pen' || value === 'rect' || value === 'eraser' || value === 'select'
  );
};

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

function isBaseShape(value: object): value is BaseShape {
  const base = value as Record<string, unknown>;
  return (
    isNonEmptyString(base['id']) &&
    isNonEmptyString(base['authorId']) &&
    isNonEmptyString(base['authorColor']) &&
    isFiniteNumber(base['createdAt'])
  );
}

function validatePenStroke(value: object): PenStroke | null {
  const candidate = value as Record<string, unknown>;
  if (!isBaseShape(candidate)) return null;
  if (candidate['type'] !== 'pen') return null;
  if (!isNonEmptyString(candidate['color'])) return null;
  if (!isFiniteNumber(candidate['width']) || candidate['width'] <= 0) return null;
  if (!Array.isArray(candidate['points'])) return null;
  const points = candidate['points'];
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

export function validateShape(input: unknown): Shape | null {
  if (typeof input !== 'object' || input === null) return null;
  const value = input as Record<string, unknown>;
  if (value['type'] === 'pen') return validatePenStroke(value);
  if (value['type'] === 'rect') return validateRectShape(value);
  return null;
}

export function generateShapeId(): ShapeId {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
