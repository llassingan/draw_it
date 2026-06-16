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

interface BoardState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  zoom: number;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  reset: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  tool: 'pen',
  color: DEFAULT_COLOR,
  strokeWidth: 2,
  zoom: ZOOM_DEFAULT,
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
    set({ zoom: clampZoom(zoom) });
  },
  zoomIn: () => {
    set((s) => ({ zoom: clampZoom(s.zoom + ZOOM_STEP) }));
  },
  zoomOut: () => {
    set((s) => ({ zoom: clampZoom(s.zoom - ZOOM_STEP) }));
  },
  resetZoom: () => {
    set({ zoom: ZOOM_DEFAULT });
  },
  reset: () => {
    set({ tool: 'pen', color: DEFAULT_COLOR, strokeWidth: 2, zoom: ZOOM_DEFAULT });
  },
}));

export { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT, clampZoom };
