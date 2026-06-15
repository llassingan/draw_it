import { DEFAULT_COLOR, type Tool } from '@whiteboard/shared';
import { create } from 'zustand';


interface BoardState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  reset: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  tool: 'pen',
  color: DEFAULT_COLOR,
  strokeWidth: 2,
  setTool: (tool) => {
    set({ tool });
  },
  setColor: (color) => {
    set({ color });
  },
  setStrokeWidth: (strokeWidth) => {
    set({ strokeWidth });
  },
  reset: () => {
    set({ tool: 'pen', color: DEFAULT_COLOR, strokeWidth: 2 });
  },
}));
