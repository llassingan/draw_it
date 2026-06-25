/**
 * Hit-testing helpers for the eraser tool.
 *
 * When the user clicks or drags with the eraser, we need to determine which
 * shape(s) the pointer is over. This module provides per-shape hit-test
 * functions and a batch variant (`hitTestAll`) that returns all matching
 * shape indices.
 */

import {
  isCircleShape,
  isPenStroke,
  isRectShape,
  isTriangleShape,
  type Point,
  type Shape,
} from './shapes';

/**
 * Extra margin (in pixels) added to the hit area around every shape.
 * Compensates for imprecise touch/click positioning so users don't need
 * pixel-perfect aim to erase a stroke.
 */
export const HIT_TOLERANCE_PX = 4;

/**
 * Dispatches to the correct hit-test function based on the shape's
 * discriminator (`shape.type`).
 */
export function hitTest(point: Point, shape: Shape): boolean {
  if (isPenStroke(shape)) {
    return penHitTest(point, shape.points, shape.width);
  }
  if (isRectShape(shape)) {
    return rectHitTest(point, shape.start, shape.end, shape.width);
  }
  if (isTriangleShape(shape)) {
    return triangleHitTest(point, shape.a, shape.b, shape.c, shape.width);
  }
  if (isCircleShape(shape)) {
    return circleHitTest(point, shape.center, shape.radius, shape.width);
  }
  return false;
}

/**
 * Pen / freehand hit test: checks the point's distance to every line segment
 * formed by consecutive pairs in the flat `points` array.
 */
function penHitTest(point: Point, points: number[], width: number): boolean {
  if (points.length < 2) return false;
  const radius = width / 2 + HIT_TOLERANCE_PX;
  const radiusSquared = radius * radius;
  const firstX = points[0];
  const firstY = points[1];
  if (firstX === undefined || firstY === undefined) return false;
  if (distanceSquared(point.x, point.y, firstX, firstY) <= radiusSquared) {
    return true;
  }
  for (let i = 2; i < points.length; i += 2) {
    const prevX = points[i - 2];
    const prevY = points[i - 1];
    const currX = points[i];
    const currY = points[i + 1];
    if (prevX === undefined || prevY === undefined) continue;
    if (currX === undefined || currY === undefined) continue;
    if (distancePointToSegmentSquared(point.x, point.y, prevX, prevY, currX, currY) <= radiusSquared) {
      return true;
    }
  }
  return false;
}

/**
 * Rectangle hit test: expands the bounding box by the stroke width + tolerance
 * and checks if the point falls within.
 */
function rectHitTest(point: Point, start: Point, end: Point, width: number): boolean {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const tolerance = width / 2 + HIT_TOLERANCE_PX;
  return (
    point.x >= minX - tolerance &&
    point.x <= maxX + tolerance &&
    point.y >= minY - tolerance &&
    point.y <= maxY + tolerance
  );
}

/**
 * Triangle hit test: first checks the filled interior (point-in-triangle
 * via barycentric / sign-of-half-plane test), then falls back to checking
 * distance to each of the three edges.
 */
function triangleHitTest(
  point: Point,
  a: Point,
  b: Point,
  c: Point,
  width: number,
): boolean {
  const tolerance = width / 2 + HIT_TOLERANCE_PX;
  if (pointInTriangle(point, a, b, c)) {
    return true;
  }
  const t2 = tolerance * tolerance;
  return (
    distancePointToSegmentSquared(point.x, point.y, a.x, a.y, b.x, b.y) <= t2 ||
    distancePointToSegmentSquared(point.x, point.y, b.x, b.y, c.x, c.y) <= t2 ||
    distancePointToSegmentSquared(point.x, point.y, c.x, c.y, a.x, a.y) <= t2
  );
}

/**
 * Tests whether point `p` lies inside the triangle formed by vertices a, b, c.
 * Uses the half-plane / barycentric technique: computes the signed area
 * (cross product) for each edge. If all signs are the same (or zero), the
 * point is inside.
 */
function pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/** Signed area / cross product: (p1 - p3) × (p2 - p3). */
function sign(p1: Point, p2: Point, p3: Point): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

/**
 * Circle hit test: checks radial distance from the center, expanded by the
 * stroke width and tolerance.
 */
function circleHitTest(point: Point, center: Point, radius: number, width: number): boolean {
  const tolerance = width / 2 + HIT_TOLERANCE_PX;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return dx * dx + dy * dy <= (radius + tolerance) * (radius + tolerance);
}

/** Squared Euclidean distance between two points (a, b). */
function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Squared distance from point P to the nearest point on line segment AB.
 *
 * Standard geometry: project P onto AB (clamped to [0, 1]), then measure
 * distance to the projected point. Uses squared values throughout to avoid
 * a `Math.sqrt` call in the hot path.
 */
function distancePointToSegmentSquared(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSquared = abx * abx + aby * aby;
  if (abLenSquared === 0) {
    return apx * apx + apy * apy; // A and B coincide — segment is a point
  }
  let t = (apx * abx + apy * aby) / abLenSquared; // projection parameter
  t = Math.max(0, Math.min(1, t)); // clamp to segment
  const cx = ax + t * abx; // closest point on segment
  const cy = ay + t * aby;
  return distanceSquared(px, py, cx, cy);
}

/**
 * Returns the indices of all shapes that intersect the given point.
 *
 * Indices are returned in **z-order** (front to back): index 0 is the
 * earliest-drawn (bottom) shape, and the last index is the most recently
 * drawn (topmost) shape. This ordering is natural because the shapes array
 * is append-only in draw order.
 */
export function hitTestAll(point: Point, shapes: readonly Shape[]): number[] {
  const matches: number[] = [];
  for (let i = 0; i < shapes.length; i += 1) {
    const shape = shapes[i];
    if (shape === undefined) continue;
    if (hitTest(point, shape)) {
      matches.push(i);
    }
  }
  return matches;
}
