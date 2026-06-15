import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useBoardStore } from './boardStore';

describe('useBoardStore', () => {
  it('starts with sane defaults', () => {
    const { result } = renderHook(() => useBoardStore());
    expect(result.current.tool).toBe('pen');
    expect(result.current.strokeWidth).toBe(2);
    expect(result.current.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('setTool updates the tool', () => {
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setTool('rect');
    });
    expect(result.current.tool).toBe('rect');
    act(() => {
      result.current.setTool('eraser');
    });
    expect(result.current.tool).toBe('eraser');
  });

  it('setColor updates the color', () => {
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setColor('#ff00ff');
    });
    expect(result.current.color).toBe('#ff00ff');
  });

  it('setStrokeWidth updates the width', () => {
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setStrokeWidth(8);
    });
    expect(result.current.strokeWidth).toBe(8);
  });

  it('reset returns to defaults', () => {
    const { result } = renderHook(() => useBoardStore());
    act(() => {
      result.current.setTool('rect');
      result.current.setColor('#00ff00');
      result.current.setStrokeWidth(10);
      result.current.reset();
    });
    expect(result.current.tool).toBe('pen');
    expect(result.current.strokeWidth).toBe(2);
  });
});
