/**
 * Zustand store for **local-only UI state** — NOT synced via Yjs.
 *
 * Stores tool selection, color, stroke width, and the per-user viewport state
 * (pan position + zoom level). Each client has its own independent store instance;
 * peers do NOT see each other's pan/zoom.
 *
 * The Y.Doc is the source of truth for shapes and presence (awareness); this store
 * only holds transient UI flags that are meaningless to other users.
 */
import {
  DEFAULT_COLOR,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type Tool,
} from '@whiteboard/shared';
import { create } from 'zustand';

/**
 * Clamps a zoom value to the allowed range [ZOOM_MIN, ZOOM_MAX].
 * Guards against NaN and infinities — returns ZOOM_DEFAULT for any degenerate input.
 */
const clampZoom = (value: number): number => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return ZOOM_DEFAULT;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
};

export interface View {
  panX: number;
  panY: number;
  zoom: number;
}

export interface CursorScreenPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Zoom-toward-cursor: adjusts pan so the point under the cursor stays fixed
 * while the viewport scales around it.
 *
 *   1. Convert cursor screen coords → world coords at the old zoom
 *   2. Map that world point back to screen coords at the new zoom
 *   3. Return the pan offset that keeps the cursor stationary
 */
export function panForZoomToPoint(
  current: View,
  newZoom: number,
  cursor: CursorScreenPoint,
): { panX: number; panY: number } {
  const safeOldZoom = current.zoom > 0 && Number.isFinite(current.zoom) ? current.zoom : 1;
  const safeNewZoom = newZoom > 0 && Number.isFinite(newZoom) ? newZoom : safeOldZoom;
  // Convert cursor screen position → world coordinates at old zoom
  const worldX = (cursor.x - current.panX) / safeOldZoom;
  const worldY = (cursor.y - current.panY) / safeOldZoom;
  // Convert world position back → screen coordinates at new zoom (this is the new pan)
  return {
    panX: cursor.x - worldX * safeNewZoom,
    panY: cursor.y - worldY * safeNewZoom,
  };
}

interface BoardState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  /** Per-user viewport (panX, panY, zoom) — NOT shared between peers. Each client has its own independent view. */
  view: View;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (panX: number, panY: number) => void;
  panBy: (dx: number, dy: number) => void;
  setView: (view: Partial<View>) => void;
  resetView: () => void;
  reset: () => void;
}

const DEFAULT_VIEW: View = { panX: 0, panY: 0, zoom: ZOOM_DEFAULT };

export const useBoardStore = create<BoardState>((set) => ({
  tool: 'pen',
  color: DEFAULT_COLOR,
  strokeWidth: 2,
  view: DEFAULT_VIEW,
  setTool: (tool) => {
    set({ tool });
  },
  setColor: (color) => {
    set({ color });
  },
  setStrokeWidth: (strokeWidth) => {
    set({ strokeWidth });
  },
  setZoom: (zoom) => {
    set((s) => ({ view: { ...s.view, zoom: clampZoom(zoom) } }));
  },
  zoomIn: () => {
    set((s) => ({ view: { ...s.view, zoom: clampZoom(s.view.zoom + ZOOM_STEP) } }));
  },
  zoomOut: () => {
    set((s) => ({ view: { ...s.view, zoom: clampZoom(s.view.zoom - ZOOM_STEP) } }));
  },
  resetZoom: () => {
    set((s) => ({ view: { ...s.view, zoom: ZOOM_DEFAULT } }));
  },
  setPan: (panX, panY) => {
    if (!Number.isFinite(panX) || !Number.isFinite(panY)) return;
    set((s) => ({ view: { ...s.view, panX, panY } }));
  },
  panBy: (dx, dy) => {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    set((s) => ({
      view: { ...s.view, panX: s.view.panX + dx, panY: s.view.panY + dy },
    }));
  },
  /**
   * General-purpose viewport setter — used by the Board's Ctrl+scroll
   * handler to apply pan+zoom simultaneously.
   */
  setView: (next) => {
    set((s) => {
      const merged: View = { ...s.view, ...next };
      if (next.zoom !== undefined) merged.zoom = clampZoom(next.zoom);
      if (next.panX !== undefined && !Number.isFinite(next.panX)) return s;
      if (next.panY !== undefined && !Number.isFinite(next.panY)) return s;
      return { view: merged };
    });
  },
  resetView: () => {
    set({ view: { ...DEFAULT_VIEW } });
  },
  reset: () => {
    set({ tool: 'pen', color: DEFAULT_COLOR, strokeWidth: 2, view: { ...DEFAULT_VIEW } });
  },
}));

export { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT, DEFAULT_VIEW, clampZoom };
