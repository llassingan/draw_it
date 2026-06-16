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

function stubCanvasRect(width: number, height: number): void {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON: () => '',
    }),
  });
}

describe('Canvas', () => {
  it('renders a canvas element that fills its container', () => {
    stubCanvasRect(1400, 900);
    const { container } = render(<Canvas shapes={makeShapes()} tool="pen" />);
    const canvas = screen.getByTestId('whiteboard-canvas');
    expect(canvas.tagName).toBe('CANVAS');
    const wrapper = container.querySelector('[data-testid="canvas-wrapper"]');
    expect(wrapper).not.toBeNull();
    expect((canvas as HTMLCanvasElement).style.width).toBe('100%');
    expect((canvas as HTMLCanvasElement).style.height).toBe('100%');
  });

  it('exposes the current tool as a data attribute', () => {
    const { rerender } = render(<Canvas shapes={[]} tool="pen" />);
    expect(screen.getByTestId('whiteboard-canvas').getAttribute('data-tool')).toBe('pen');
    rerender(<Canvas shapes={[]} tool="rect" />);
    expect(screen.getByTestId('whiteboard-canvas').getAttribute('data-tool')).toBe('rect');
  });

  it('uses crosshair cursor on the wrapper when no cursor prop is given', () => {
    const { container } = render(<Canvas shapes={[]} tool="eraser" />);
    const wrapper = container.querySelector('[data-testid="canvas-wrapper"]');
    expect(wrapper).not.toBeNull();
    expect((wrapper as HTMLElement).style.cursor).toBe('crosshair');
  });

  it('forwards the cursor prop to the wrapper element', () => {
    const { container, rerender } = render(<Canvas shapes={[]} tool="pen" cursor="grab" />);
    const wrapper = container.querySelector('[data-testid="canvas-wrapper"]');
    expect((wrapper as HTMLElement).style.cursor).toBe('grab');
    rerender(<Canvas shapes={[]} tool="pen" cursor="grabbing" />);
    expect((wrapper as HTMLElement).style.cursor).toBe('grabbing');
  });

  it('invokes onPointerDown/Move/Up with world-space coordinates (no pan offset)', () => {
    stubCanvasRect(1080, 720);
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
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(canvas, { clientX: 300, clientY: 400 });
    expect(onPointerDown).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(onPointerMove).toHaveBeenCalledWith({ x: 300, y: 400 });
    expect(onPointerUp).toHaveBeenCalledWith({ x: 300, y: 400 });
  });

  it('applies pan and zoom when converting pointer events to world coordinates', () => {
    // Canvas's getBoundingClientRect returns the VISUAL rect (after the parent's
    // translate+scale transform), not the CSS rect. The Canvas only knows about
    // its own rect; the pan is reflected in rect.left/top, and the zoom in
    // rect.width/height.
    Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 160,
        top: 90,
        right: 160 + 2800,
        bottom: 90 + 1800,
        width: 2800,
        height: 1800,
        x: 160,
        y: 90,
        toJSON: () => '',
      }),
    });
    const onPointerDown = vi.fn();
    render(
      <Canvas
        shapes={[]}
        tool="pen"
        panX={160}
        panY={90}
        zoom={2}
        onPointerDown={onPointerDown}
      />,
    );
    const canvas = screen.getByTestId('whiteboard-canvas');
    fireEvent.pointerDown(canvas, { clientX: 500, clientY: 400 });
    expect(onPointerDown).toHaveBeenCalledWith({ x: 170, y: 155 });
  });
});
