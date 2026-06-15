import { isPenStroke, isRectShape, type Point, type Shape } from './shapes';

export const HIT_TOLERANCE_PX = 4;

export function hitTest(point: Point, shape: Shape): boolean {
  if (isPenStroke(shape)) {
    return penHitTest(point, shape.points, shape.width);
  }
  if (isRectShape(shape)) {
    return rectHitTest(point, shape.start, shape.end, shape.width);
  }
  return false;
}

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

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

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
    return apx * apx + apy * apy;
  }
  let t = (apx * abx + apy * aby) / abLenSquared;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return distanceSquared(px, py, cx, cy);
}

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
