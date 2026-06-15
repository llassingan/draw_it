import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Y from 'yjs';

import type { Shape } from '@whiteboard/shared';

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
import type { WebsocketProvider } from 'y-websocket';
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

  it('shows no overlay once the Y.Doc is ready (always locally ready)', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: true });
    render(<Board roomId="r" wsUrl="ws://x" />);
    expect(screen.queryByTestId('loading-overlay')).toBeNull();
    expect(screen.queryByTestId('connection-badge')).toBeNull();
  });

  it('shows a small connection badge at the bottom when not connected', () => {
    const doc = new Y.Doc();
    setupMocks({ shapes: doc.getArray<Shape>('shapes'), isReady: true, isConnected: false });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const badge = screen.getByTestId('connection-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/offline|working/i);
  });

  it('draws a pen stroke on pointerdown + pointermove + pointerup', async () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray<Shape>('shapes');
    setupMocks({ shapes, isReady: true, isConnected: true });
    useBoardStore.setState({ tool: 'pen', color: '#000000', strokeWidth: 2 });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const canvas = screen.getByTestId('whiteboard-canvas');
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(canvas, { clientX: 100, clientY: 100 });
    expect(shapes.length).toBe(1);
    const s = shapes.get(0);
    expect(s?.type).toBe('pen');
  });

  it('draws a rect on pointerdown + pointermove + pointerup', async () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray<Shape>('shapes');
    setupMocks({ shapes, isReady: true, isConnected: true });
    useBoardStore.setState({ tool: 'rect', color: '#000000', strokeWidth: 2 });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const canvas = screen.getByTestId('whiteboard-canvas');
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(canvas, { clientX: 100, clientY: 100 });
    expect(shapes.length).toBe(1);
    expect(shapes.get(0)?.type).toBe('rect');
  });

  it('erases a shape when eraser tool is active', () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray<Shape>('shapes');
    const rect = {
      id: 'r1',
      type: 'rect' as const,
      authorId: 'a',
      authorColor: '#000',
      createdAt: 0,
      color: '#000',
      width: 2,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
    };
    shapes.push([rect]);
    setupMocks({ shapes, isReady: true, isConnected: true });
    useBoardStore.setState({ tool: 'eraser' });
    render(<Board roomId="r" wsUrl="ws://x" />);
    const canvas = screen.getByTestId('whiteboard-canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 1080, bottom: 720, width: 1080, height: 720, x: 0, y: 0, toJSON: () => '' }),
    });
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50 });
    expect(shapes.length).toBe(0);
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
    const canvas = screen.getByTestId('whiteboard-canvas');
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 40 });
    expect(setCursor).toHaveBeenCalled();
  });

  it('switches tool via the toolbar', async () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray<Shape>('shapes');
    setupMocks({ shapes, isReady: true, isConnected: true });
    const user = userEvent.setup();
    render(<Board roomId="r" wsUrl="ws://x" />);
    await user.click(screen.getByTestId('tool-rect'));
    expect(useBoardStore.getState().tool).toBe('rect');
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
