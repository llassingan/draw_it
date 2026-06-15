import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as Y from 'yjs';

import { useAwareness } from './useAwareness';

interface FakeState {
  user?: { name: string; color: string; tool: string };
  cursor?: { x: number; y: number } | null;
}

class FakeAwareness {
  clientID = 42;
  private local: FakeState = {};
  private states = new Map<number, FakeState>();
  private listeners = new Set<() => void>();
  getStates(): Map<number, FakeState> {
    if (!this.states.has(this.clientID)) this.states.set(this.clientID, this.local);
    return this.states;
  }
  getLocalState(): FakeState | null {
    return this.local;
  }
  setLocalState(state: FakeState): void {
    this.local = state;
    this.states.set(this.clientID, state);
    for (const l of this.listeners) l();
  }
  on(_event: 'change', cb: () => void): void {
    this.listeners.add(cb);
  }
  off(_event: 'change', cb: () => void): void {
    this.listeners.delete(cb);
  }
}

class FakeProvider {
  awareness = new FakeAwareness();
  url: string;
  room: string;
  doc: Y.Doc;
  destroyed = false;
  constructor(url: string, room: string) {
    this.url = url;
    this.room = room;
    this.doc = new Y.Doc();
  }
  destroy(): void {
    this.destroyed = true;
  }
}

describe('useAwareness', () => {
  let provider: FakeProvider;
  beforeEach(() => {
    provider = new FakeProvider('ws://test', 'room-1');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes the local user on first render', async () => {
    const { result } = renderHook(() => useAwareness(provider as unknown as never));
    await waitFor(() => {
      expect(result.current.localUser).not.toBeNull();
    });
    expect(result.current.localUser?.clientId).toBe(42);
    expect(result.current.localUser?.tool).toBe('pen');
    expect(result.current.localUser?.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('setCursor publishes a cursor state immediately', async () => {
    const { result } = renderHook(() => useAwareness(provider as unknown as never));
    await waitFor(() => expect(result.current.localUser).not.toBeNull());
    await new Promise((r) => setTimeout(r, 50));
    result.current.setCursor({ x: 100, y: 200 });
    await waitFor(() => {
      const state = provider.awareness.getLocalState();
      expect(state?.cursor).toEqual({ x: 100, y: 200 });
    });
  });

  it('setTool publishes the new tool', async () => {
    const { result } = renderHook(() => useAwareness(provider as unknown as never));
    await waitFor(() => expect(result.current.localUser).not.toBeNull());
    await new Promise((r) => setTimeout(r, 50));
    result.current.setTool('rect');
    await waitFor(() => {
      const state = provider.awareness.getLocalState();
      expect(state?.user?.tool).toBe('rect');
    });
  });

  it('throttles repeated cursor updates', async () => {
    const { result } = renderHook(() => useAwareness(provider as unknown as never));
    await waitFor(() => expect(result.current.localUser).not.toBeNull());
    await new Promise((r) => setTimeout(r, 50));

    result.current.setCursor({ x: 0, y: 0 });
    await waitFor(() => {
      const state = provider.awareness.getLocalState();
      expect(state?.cursor).toEqual({ x: 0, y: 0 });
    });

    result.current.setCursor({ x: 1, y: 1 });
    result.current.setCursor({ x: 2, y: 2 });
    const immediate = provider.awareness.getLocalState();
    expect(immediate?.cursor).toEqual({ x: 0, y: 0 });

    await new Promise((r) => setTimeout(r, 80));
    const after = provider.awareness.getLocalState();
    expect(after?.cursor).toEqual({ x: 2, y: 2 });
  });
});
