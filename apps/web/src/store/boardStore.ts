import {
  DEFAULT_COLOR,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type Tool,
} from '@whiteboard/shared';
import { create } from 'zustand';

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

export function panForZoomToPoint(
  current: View,
  newZoom: number,
  cursor: CursorScreenPoint,
): { panX: number; panY: number } {
  const safeOldZoom = current.zoom > 0 && Number.isFinite(current.zoom) ? current.zoom : 1;
  const safeNewZoom = newZoom > 0 && Number.isFinite(newZoom) ? newZoom : safeOldZoom;
  const worldX = (cursor.x - current.panX) / safeOldZoom;
  const worldY = (cursor.y - current.panY) / safeOldZoom;
  return {
    panX: cursor.x - worldX * safeNewZoom,
    panY: cursor.y - worldY * safeNewZoom,
  };
}

interface BoardState {
  tool: Tool;
  color: string;
  strokeWidth: number;
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
