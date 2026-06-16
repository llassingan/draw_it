import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '@whiteboard/shared';

import { useBoardStore } from './boardStore';

const reset = (): void => {
  act(() => {
    useBoardStore.getState().reset();
  });
};

describe('useBoardStore', () => {
  it('starts with sane defaults', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    expect(result.current.tool).toBe('pen');
    expect(result.current.strokeWidth).toBe(2);
    expect(result.current.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.current.zoom).toBe(ZOOM_DEFAULT);
  });

  it('setTool updates the tool', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setTool('rect'));
    expect(result.current.tool).toBe('rect');
    act(() => result.current.setTool('triangle'));
    expect(result.current.tool).toBe('triangle');
    act(() => result.current.setTool('circle'));
    expect(result.current.tool).toBe('circle');
    act(() => result.current.setTool('eraser'));
    expect(result.current.tool).toBe('eraser');
  });

  it('setColor updates the color', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setColor('#ff00ff'));
    expect(result.current.color).toBe('#ff00ff');
  });

  it('setStrokeWidth updates the width', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setStrokeWidth(8));
    expect(result.current.strokeWidth).toBe(8);
  });

  it('reset returns to defaults (tool, color, width, zoom)', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setTool('rect');
      result.current.setColor('#00ff00');
      result.current.setStrokeWidth(10);
      result.current.setZoom(2.5);
      result.current.reset();
    });
    expect(result.current.tool).toBe('pen');
    expect(result.current.strokeWidth).toBe(2);
    expect(result.current.zoom).toBe(ZOOM_DEFAULT);
  });
});

describe('useBoardStore zoom', () => {
  it('zoomIn increases by ZOOM_STEP, clamped to ZOOM_MAX', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.zoomIn());
    expect(result.current.zoom).toBeCloseTo(ZOOM_DEFAULT + ZOOM_STEP, 6);
    act(() => result.current.setZoom(ZOOM_MAX - 0.05));
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    expect(result.current.zoom).toBe(ZOOM_MAX);
  });

  it('zoomOut decreases by ZOOM_STEP, clamped to ZOOM_MIN', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.zoomOut());
    expect(result.current.zoom).toBeCloseTo(ZOOM_DEFAULT - ZOOM_STEP, 6);
    act(() => result.current.setZoom(ZOOM_MIN + 0.05));
    act(() => result.current.zoomOut());
    act(() => result.current.zoomOut());
    expect(result.current.zoom).toBe(ZOOM_MIN);
  });

  it('setZoom clamps out-of-range values', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setZoom(99));
    expect(result.current.zoom).toBe(ZOOM_MAX);
    act(() => result.current.setZoom(-2));
    expect(result.current.zoom).toBe(ZOOM_MIN);
    act(() => result.current.setZoom(Number.NaN));
    expect(result.current.zoom).toBe(ZOOM_DEFAULT);
  });

  it('resetZoom returns to ZOOM_DEFAULT', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setZoom(2);
      result.current.resetZoom();
    });
    expect(result.current.zoom).toBe(ZOOM_DEFAULT);
  });
});
