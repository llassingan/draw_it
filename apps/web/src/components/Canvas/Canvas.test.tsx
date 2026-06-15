import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import Canvas from './Canvas';
import type { Shape } from '@whiteboard/shared';

function makeShapes(): Shape[] {
  return [
    {
      id: 'p1',
      type: 'pen',
      authorId: 'a',
      authorColor: '#000',
      createdAt: 0,
      color: '#000',
      width: 2,
      points: [10, 10, 50, 50],
    },
    {
      id: 'r1',
      type: 'rect',
      authorId: 'a',
      authorColor: '#000',
      createdAt: 0,
      color: '#f00',
      width: 2,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
    },
  ];
}

describe('Canvas', () => {
  it('renders a 1080x720 canvas element', () => {
    render(<Canvas shapes={makeShapes()} tool="pen" />);
    const canvas = screen.getByTestId('whiteboard-canvas');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.getAttribute('width')).toBe('1080');
    expect(canvas.getAttribute('height')).toBe('720');
  });

  it('exposes the current tool as a data attribute', () => {
    const { rerender } = render(<Canvas shapes={[]} tool="pen" />);
    expect(screen.getByTestId('whiteboard-canvas').getAttribute('data-tool')).toBe('pen');
    rerender(<Canvas shapes={[]} tool="rect" />);
    expect(screen.getByTestId('whiteboard-canvas').getAttribute('data-tool')).toBe('rect');
  });

  it('uses crosshair cursor when eraser tool is active', () => {
    render(<Canvas shapes={[]} tool="eraser" />);
    const canvas = screen.getByTestId('whiteboard-canvas');
    expect((canvas as HTMLCanvasElement).style.cursor).toBe('crosshair');
  });

  it('invokes onPointerDown/Move/Up with canvas-space coordinates', () => {
    const onPointerDown = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerUp = vi.fn();
    render(
      <Canvas
        shapes={[]}
        tool="pen"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />,
    );
    const canvas = screen.getByTestId('whiteboard-canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 1080, bottom: 720, width: 1080, height: 720, x: 0, y: 0, toJSON: () => '' }),
    });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(canvas, { clientX: 300, clientY: 400 });
    expect(onPointerDown).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(onPointerMove).toHaveBeenCalledWith({ x: 300, y: 400 });
    expect(onPointerUp).toHaveBeenCalledWith({ x: 300, y: 400 });
  });
});
