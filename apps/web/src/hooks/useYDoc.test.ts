import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as Y from 'yjs';

vi.mock('y-websocket', () => {
  return {
    WebsocketProvider: class {
      doc: Y.Doc;
      url: string;
      room: string;
      awareness: {
        clientID: number;
        getStates: () => Map<number, unknown>;
        getLocalState: () => unknown;
        setLocalState: (s: unknown) => void;
        on: () => void;
        off: () => void;
      };
      destroyed = false;
      statusListeners = new Set<(e: { status: string }) => void>();
      constructor(url: string, room: string, doc: Y.Doc) {
        this.url = url;
        this.room = room;
        this.doc = doc;
        this.awareness = {
          clientID: 1,
          getStates: () => new Map(),
          getLocalState: () => null,
          setLocalState: () => {},
          on: () => {},
          off: () => {},
        };
      }
      on(event: string, cb: (e: unknown) => void): void {
        if (event === 'status') this.statusListeners.add(cb as (e: { status: string }) => void);
      }
      off(event: string, cb: (e: unknown) => void): void {
        if (event === 'status') this.statusListeners.delete(cb as (e: { status: string }) => void);
      }
      destroy(): void {
        this.destroyed = true;
        this.statusListeners.clear();
      }
    },
  };
});

import { useYDoc } from './useYDoc';

describe('useYDoc', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes a Y.Doc and a Y.Array named "shapes"', async () => {
    const { result } = renderHook(() => useYDoc('room-1', 'ws://test'));
    await waitFor(() => {
      expect(result.current.ydoc).not.toBeNull();
    });
    expect(result.current.ydoc).toBeInstanceOf(Y.Doc);
    expect(result.current.shapes).not.toBeNull();
    expect(result.current.shapes?.length).toBe(0);
  });

  it('marks the doc ready synchronously (no UI gate on WS sync)', async () => {
    const { result } = renderHook(() => useYDoc('room-1', 'ws://test'));
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it('exposes awareness from the provider', async () => {
    const { result } = renderHook(() => useYDoc('room-1', 'ws://test'));
    await waitFor(() => {
      expect(result.current.ydoc).not.toBeNull();
    });
    expect(result.current.awareness).toBeTruthy();
  });

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useYDoc('room-1', 'ws://test'));
    await waitFor(() => expect(result.current.ydoc).not.toBeNull());
    const provider = result.current.provider as unknown as { destroyed: boolean };
    expect(provider).not.toBeNull();
    unmount();
    expect(provider.destroyed).toBe(true);
  });
});
