import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '@whiteboard/shared';

import { panForZoomToPoint, useBoardStore } from './boardStore';

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
    expect(result.current.view.zoom).toBe(ZOOM_DEFAULT);
    expect(result.current.view.panX).toBe(0);
    expect(result.current.view.panY).toBe(0);
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

  it('reset returns to defaults (tool, color, width, view)', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setTool('rect');
      result.current.setColor('#00ff00');
      result.current.setStrokeWidth(10);
      result.current.setZoom(2.5);
      result.current.setPan(123, 456);
      result.current.reset();
    });
    expect(result.current.tool).toBe('pen');
    expect(result.current.strokeWidth).toBe(2);
    expect(result.current.view.zoom).toBe(ZOOM_DEFAULT);
    expect(result.current.view.panX).toBe(0);
    expect(result.current.view.panY).toBe(0);
  });
});

describe('useBoardStore zoom', () => {
  it('zoomIn increases by ZOOM_STEP, clamped to ZOOM_MAX', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.zoomIn());
    expect(result.current.view.zoom).toBeCloseTo(ZOOM_DEFAULT + ZOOM_STEP, 6);
    act(() => result.current.setZoom(ZOOM_MAX - 0.05));
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    expect(result.current.view.zoom).toBe(ZOOM_MAX);
  });

  it('zoomOut decreases by ZOOM_STEP, clamped to ZOOM_MIN', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.zoomOut());
    expect(result.current.view.zoom).toBeCloseTo(ZOOM_DEFAULT - ZOOM_STEP, 6);
    act(() => result.current.setZoom(ZOOM_MIN + 0.05));
    act(() => result.current.zoomOut());
    act(() => result.current.zoomOut());
    expect(result.current.view.zoom).toBe(ZOOM_MIN);
  });

  it('setZoom clamps out-of-range values', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setZoom(99));
    expect(result.current.view.zoom).toBe(ZOOM_MAX);
    act(() => result.current.setZoom(-2));
    expect(result.current.view.zoom).toBe(ZOOM_MIN);
    act(() => result.current.setZoom(Number.NaN));
    expect(result.current.view.zoom).toBe(ZOOM_DEFAULT);
  });

  it('resetZoom returns to ZOOM_DEFAULT', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setZoom(2);
      result.current.resetZoom();
    });
    expect(result.current.view.zoom).toBe(ZOOM_DEFAULT);
  });
});

describe('useBoardStore pan', () => {
  it('setPan updates panX and panY', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setPan(120, -45));
    expect(result.current.view.panX).toBe(120);
    expect(result.current.view.panY).toBe(-45);
  });

  it('setPan ignores NaN and Infinity', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setPan(50, 60));
    act(() => result.current.setPan(Number.NaN, 0));
    act(() => result.current.setPan(0, Number.POSITIVE_INFINITY));
    expect(result.current.view.panX).toBe(50);
    expect(result.current.view.panY).toBe(60);
  });

  it('panBy adds the deltas to current pan', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setPan(10, 20));
    act(() => result.current.panBy(5, -3));
    expect(result.current.view.panX).toBe(15);
    expect(result.current.view.panY).toBe(17);
  });

  it('setView applies a partial view update and clamps zoom', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => result.current.setView({ panX: 30, panY: 40, zoom: 99 }));
    expect(result.current.view.panX).toBe(30);
    expect(result.current.view.panY).toBe(40);
    expect(result.current.view.zoom).toBe(ZOOM_MAX);
  });

  it('resetView clears both pan and zoom', () => {
    reset();
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setPan(99, 88);
      result.current.setZoom(2.5);
      result.current.resetView();
    });
    expect(result.current.view.zoom).toBe(ZOOM_DEFAULT);
    expect(result.current.view.panX).toBe(0);
    expect(result.current.view.panY).toBe(0);
  });
});

describe('panForZoomToPoint', () => {
  it('keeps the world point under the cursor stationary when zooming in', () => {
    const current = { panX: 0, panY: 0, zoom: 1 };
    const cursor = { x: 300, y: 200 };
    const next = panForZoomToPoint(current, 2, cursor);
    expect(next.panX).toBeCloseTo(300 - 300 * 2, 5);
    expect(next.panY).toBeCloseTo(200 - 200 * 2, 5);
  });

  it('keeps the world point under the cursor stationary when zooming out', () => {
    const current = { panX: 50, panY: 30, zoom: 2 };
    const cursor = { x: 400, y: 250 };
    const next = panForZoomToPoint(current, 1, cursor);
    const worldX = (400 - 50) / 2;
    const worldY = (250 - 30) / 2;
    expect(next.panX).toBeCloseTo(400 - worldX * 1, 5);
    expect(next.panY).toBeCloseTo(250 - worldY * 1, 5);
  });

  it('returns the same pan when zoom does not change (degenerate case)', () => {
    const current = { panX: 10, panY: 20, zoom: 1 };
    const next = panForZoomToPoint(current, 1, { x: 100, y: 100 });
    expect(next.panX).toBeCloseTo(10, 5);
    expect(next.panY).toBeCloseTo(20, 5);
  });

  it('handles non-finite values safely', () => {
    const current = { panX: 0, panY: 0, zoom: Number.NaN };
    const next = panForZoomToPoint(current, Number.POSITIVE_INFINITY, { x: 50, y: 60 });
    expect(Number.isFinite(next.panX)).toBe(true);
    expect(Number.isFinite(next.panY)).toBe(true);
  });
});
