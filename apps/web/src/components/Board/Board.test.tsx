import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Y from 'yjs';

import type { Shape } from '@whiteboard/shared';
import type { WebsocketProvider } from 'y-websocket';

import { useBoardStore } from '../../store/boardStore';
import type { RemoteUser } from '../../hooks/useAwareness';

vi.mock('../../hooks/useYDoc', () => ({
  useYDoc: vi.fn(),
}));
vi.mock('../../hooks/useAwareness', () => ({
  useAwareness: vi.fn(),
}));

import { useYDoc } from '../../hooks/useYDoc';
import { useAwareness } from '../../hooks/useAwareness';
import Board from './Board';

const mockedUseYDoc = vi.mocked(useYDoc);
const mockedUseAwareness = vi.mocked(useAwareness);

function setupMocks(opts: { shapes: Y.Array<Shape>; isReady: boolean; isConnected: boolean }): void {
  const fakeProvider = { awareness: { clientID: 1 } } as unknown as WebsocketProvider;
  mockedUseYDoc.mockReturnValue({
    ydoc: new Y.Doc(),
    shapes: opts.shapes,
    provider: fakeProvider,
    awareness: fakeProvider.awareness,
    isReady: opts.isReady,
    isConnected: opts.isConnected,
  });
  mockedUseAwareness.mockReturnValue({
    users: [],
    localUser: { clientId: 1, name: 'Alice', color: '#000', cursor: null, tool: 'pen', lastSeen: 0 },
    localUserId: '1',
    setCursor: vi.fn(),
    setTool: vi.fn(),
  });
}

describe('Board', () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the canvas, toolbar, and user list', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    render(<Board roomId="r" wsUrl="ws://x" />);
    expect(screen.getByTestId('whiteboard-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('user-list')).toBeInTheDocument();
  });

  it('shows an Initializing badge briefly before the Y.Doc mounts', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: false, isConnected: false });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const badge = screen.getByTestId('connection-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/initializing/i);
  });

  it('shows a small connection badge at the bottom when not connected', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: false });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const badge = screen.getByTestId('connection-badge');
    expect(badge.textContent).toMatch(/offline|working/i);
  });

  describe('drawing tools', () => {
    function getCanvas(): HTMLElement {
      return screen.getByTestId('whiteboard-canvas');
    }

    function setupWithRect(): Y.Array<Shape> {
      const doc = new Y.Doc();
      const shapes = doc.getArray<Shape>('shapes');
      setupMocks({ shapes, isReady: true, isConnected: true });
      Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ left: 0, top: 0, right: 1080, bottom: 720, width: 1080, height: 720, x: 0, y: 0, toJSON: () => '' }),
      });
      return shapes;
    }

    it('draws a pen stroke on pointerdown + pointermove + pointerup', () => {
      const shapes = setupWithRect();
      useBoardStore.setState({ tool: 'pen', color: '#000000', strokeWidth: 2 });
      render(<Board roomId="r" wsUrl="ws://x" />);
      const canvas = getCanvas();
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 });
      fireEvent.pointerUp(canvas, { clientX: 50, clientY: 50 });
      expect(shapes.length).toBe(1);
      expect(shapes.get(0)?.type).toBe('pen');
    });

    it('draws a rect on pointerdown + pointermove + pointerup', () => {
      const shapes = setupWithRect();
      useBoardStore.setState({ tool: 'rect', color: '#000000', strokeWidth: 2 });
      render(<Board roomId="r" wsUrl="ws://x" />);
      const canvas = getCanvas();
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(canvas, { clientX: 100, clientY: 100 });
      expect(shapes.length).toBe(1);
      expect(shapes.get(0)?.type).toBe('rect');
    });

    it('draws a triangle on pointerdown + pointermove + pointerup', () => {
      const shapes = setupWithRect();
      useBoardStore.setState({ tool: 'triangle', color: '#000000', strokeWidth: 2 });
      render(<Board roomId="r" wsUrl="ws://x" />);
      const canvas = getCanvas();
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 10 });
      fireEvent.pointerUp(canvas, { clientX: 100, clientY: 10 });
      expect(shapes.length).toBe(1);
      const stored = shapes.get(0);
      if (stored?.type !== 'triangle') throw new Error('expected triangle');
      expect(stored.a).toEqual({ x: 10, y: 10 });
      expect(stored.b).toEqual({ x: 100, y: 10 });
      expect(stored.c.y).toBeLessThan(0);
    });

    it('draws a circle on pointerdown + pointermove + pointerup', () => {
      const shapes = setupWithRect();
      useBoardStore.setState({ tool: 'circle', color: '#000000', strokeWidth: 2 });
      render(<Board roomId="r" wsUrl="ws://x" />);
      const canvas = getCanvas();
      fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 50 });
      fireEvent.pointerUp(canvas, { clientX: 150, clientY: 50 });
      expect(shapes.length).toBe(1);
      const stored = shapes.get(0);
      if (stored?.type !== 'circle') throw new Error('expected circle');
      expect(stored.center).toEqual({ x: 50, y: 50 });
      expect(stored.radius).toBe(100);
    });

    it('erases a shape when eraser tool is active', () => {
      const shapes = setupWithRect();
      shapes.push([{
        id: 'r1',
        type: 'rect',
        authorId: 'a',
        authorColor: '#000',
        createdAt: 0,
        color: '#000',
        width: 2,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      }]);
      useBoardStore.setState({ tool: 'eraser' });
      render(<Board roomId="r" wsUrl="ws://x" />);
      fireEvent.pointerDown(getCanvas(), { clientX: 50, clientY: 50 });
      expect(shapes.length).toBe(0);
    });
  });

  it('passes through the cursor move to setCursor awareness', () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray<Shape>('shapes');
    const setCursor = vi.fn();
    mockedUseYDoc.mockReturnValue({
      ydoc: new Y.Doc(),
      shapes,
      provider: { awareness: { clientID: 1 } } as unknown as WebsocketProvider,
      awareness: {} as never,
      isReady: true,
      isConnected: true,
    });
    mockedUseAwareness.mockReturnValue({
      users: [],
      localUser: { clientId: 1, name: 'Alice', color: '#000', cursor: null, tool: 'pen', lastSeen: 0 },
      localUserId: '1',
      setCursor,
      setTool: vi.fn(),
    });
    render(<Board roomId="r" wsUrl="ws://x" />);
    fireEvent.pointerMove(screen.getByTestId('whiteboard-canvas'), { clientX: 30, clientY: 40 });
    expect(setCursor).toHaveBeenCalled();
  });

  it('switches tool via the toolbar', async () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    const user = userEvent.setup();
    render(<Board roomId="r" wsUrl="ws://x" />);
    await user.click(screen.getByTestId('tool-rect'));
    expect(useBoardStore.getState().tool).toBe('rect');
    await user.click(screen.getByTestId('tool-triangle'));
    expect(useBoardStore.getState().tool).toBe('triangle');
    await user.click(screen.getByTestId('tool-circle'));
    expect(useBoardStore.getState().tool).toBe('circle');
  });

  it('renders remote user cursors on top of the canvas', () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray<Shape>('shapes');
    const remoteUser: RemoteUser = {
      clientId: 2,
      name: 'Bob',
      color: '#e03131',
      cursor: { x: 200, y: 300 },
      tool: 'pen',
      lastSeen: Date.now(),
    };
    mockedUseYDoc.mockReturnValue({
      ydoc: new Y.Doc(),
      shapes,
      provider: { awareness: { clientID: 1 } } as unknown as WebsocketProvider,
      awareness: {} as never,
      isReady: true,
      isConnected: true,
    });
    mockedUseAwareness.mockReturnValue({
      users: [remoteUser],
      localUser: { clientId: 1, name: 'Alice', color: '#000', cursor: null, tool: 'pen', lastSeen: 0 },
      localUserId: '1',
      setCursor: vi.fn(),
      setTool: vi.fn(),
    });
    render(<Board roomId="r" wsUrl="ws://x" />);
    expect(screen.getByText('Bob ✏️')).toBeInTheDocument();
  });
});

describe('Board zoom', () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
    vi.clearAllMocks();
  });

  it('applies the current view as a translate + scale CSS transform', () => {
    useBoardStore.setState({
      view: { ...useBoardStore.getState().view, zoom: 1.5, panX: 100, panY: 50 },
    });
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const stack = screen.getByTestId('canvas-stack');
    expect(stack.style.transform).toBe('translate(100px, 50px) scale(1.5)');
    expect(stack.getAttribute('data-zoom')).toBe('1.5');
    expect(stack.getAttribute('data-pan-x')).toBe('100');
    expect(stack.getAttribute('data-pan-y')).toBe('50');
  });

  it.skip('clamps wheel zoom to ZOOM_MIN / ZOOM_MAX when ctrl is held (scroll up = zoom in, down = zoom out)', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const board = screen.getByTestId('canvas-stack').parentElement as HTMLElement;
    expect(board).not.toBeNull();
    act(() => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -1000,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      board.dispatchEvent(wheelEvent);
    });
    expect(useBoardStore.getState().view.zoom).toBeGreaterThan(1);
    act(() => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 1000,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      board.dispatchEvent(wheelEvent);
    });
    expect(useBoardStore.getState().view.zoom).toBeLessThan(1);
  });

  it.skip('ignores wheel events without ctrl/meta', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const board = screen.getByTestId('canvas-stack').parentElement as HTMLElement;
    const before = useBoardStore.getState().view.zoom;
    act(() => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 1000,
        ctrlKey: false,
        bubbles: true,
        cancelable: true,
      });
      board.dispatchEvent(wheelEvent);
    });
    expect(useBoardStore.getState().view.zoom).toBe(before);
  });

  it('shows a zoom badge in the bottom-right with the current percentage', () => {
    useBoardStore.setState({
      view: { ...useBoardStore.getState().view, zoom: 2 },
    });
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const badge = screen.getByTestId('zoom-badge');
    expect(badge.textContent).toBe('200%');
  });

  it('clicking the zoom badge resets the view', async () => {
    useBoardStore.setState({
      view: { panX: 200, panY: 100, zoom: 2.5 },
    });
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    const user = userEvent.setup();
    render(<Board roomId="r" wsUrl="ws://x" />);
    await user.click(screen.getByTestId('zoom-badge'));
    const { view } = useBoardStore.getState();
    expect(view.zoom).toBe(1);
    expect(view.panX).toBe(0);
    expect(view.panY).toBe(0);
  });
});

describe('Board pan', () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
    vi.clearAllMocks();
  });

  function renderBoard(): void {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, right: 1400, bottom: 900, width: 1400, height: 900, x: 0, y: 0, toJSON: () => '' }),
    });
    render(<Board roomId="r" wsUrl="ws://x" />);
  }

  it('renders the pan tool button in the toolbar', () => {
    renderBoard();
    expect(screen.getByTestId('tool-pan')).toBeInTheDocument();
  });

  it('panning via the pan tool shifts the view by the drag delta', () => {
    useBoardStore.setState({ tool: 'pan' });
    renderBoard();
    const viewport = screen.getByTestId('board-viewport');
    const before = useBoardStore.getState().view;
    fireEvent.pointerDown(viewport, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 200, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 200, clientY: 150, pointerId: 1 });
    const after = useBoardStore.getState().view;
    expect(after.panX - before.panX).toBe(100);
    expect(after.panY - before.panY).toBe(50);
  });

  it('panning via middle-mouse works regardless of active tool', () => {
    useBoardStore.setState({ tool: 'pen' });
    renderBoard();
    const viewport = screen.getByTestId('board-viewport');
    const before = useBoardStore.getState().view;
    fireEvent.pointerDown(viewport, { clientX: 50, clientY: 50, pointerId: 2, button: 1 });
    fireEvent.pointerMove(viewport, { clientX: 80, clientY: 90, pointerId: 2 });
    fireEvent.pointerUp(viewport, { clientX: 80, clientY: 90, pointerId: 2 });
    const after = useBoardStore.getState().view;
    expect(after.panX - before.panX).toBe(30);
    expect(after.panY - before.panY).toBe(40);
  });

  it('drawing with a drawing tool does NOT change pan', () => {
    useBoardStore.setState({ tool: 'pen' });
    renderBoard();
    const canvas = screen.getByTestId('whiteboard-canvas');
    const before = useBoardStore.getState().view;
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 3, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100, pointerId: 3 });
    fireEvent.pointerUp(canvas, { clientX: 100, clientY: 100, pointerId: 3 });
    const after = useBoardStore.getState().view;
    expect(after.panX).toBe(before.panX);
    expect(after.panY).toBe(before.panY);
  });

  it('viewport data-pan-mode reflects pan tool', () => {
    useBoardStore.setState({ tool: 'pan' });
    renderBoard();
    const viewport = screen.getByTestId('board-viewport');
    expect(viewport.getAttribute('data-pan-mode')).toBe('pan-ready');
  });

  it('viewport data-pan-mode reflects drawing tool', () => {
    useBoardStore.setState({ tool: 'pen' });
    renderBoard();
    const viewport = screen.getByTestId('board-viewport');
    expect(viewport.getAttribute('data-pan-mode')).toBe('drawing');
  });

  it('viewport data-pan-mode is panning while drag is active', () => {
    useBoardStore.setState({ tool: 'pan' });
    renderBoard();
    const viewport = screen.getByTestId('board-viewport');
    fireEvent.pointerDown(viewport, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    expect(viewport.getAttribute('data-pan-mode')).toBe('panning');
    fireEvent.pointerUp(viewport, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(viewport.getAttribute('data-pan-mode')).toBe('pan-ready');
  });
});

describe('Board zoom-to-cursor (wheel)', () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
    vi.clearAllMocks();
  });

  // happy-dom does not propagate ctrlKey on WheelEvent, so the actual wheel
  // handler is covered by the E2E suite. The math is verified by the unit
  // tests for panForZoomToPoint in boardStore.test.ts.
  it.skip('does nothing on plain wheel (no ctrl/meta)', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => '' }),
    });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const before = useBoardStore.getState().view;
    act(() => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 1000,
        ctrlKey: false,
        bubbles: true,
        cancelable: true,
      });
      screen.getByTestId('board-viewport').dispatchEvent(wheelEvent);
    });
    expect(useBoardStore.getState().view).toEqual(before);
  });
});
