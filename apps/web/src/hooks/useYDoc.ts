/**
 * useYDoc — Yjs document lifecycle hook.
 *
 * Creates and manages a single Y.Doc instance backed by a y-websocket provider.
 * The hook is called once at the top of the React tree and is responsible for:
 *
 * 1. **Y.Doc creation** — a single Y.Doc lives for the lifetime of the room.
 *    It is created eagerly via `useState(() => new Y.Doc())` so the same
 *    instance survives re-renders, component re-mounts, and React Strict Mode
 *    double-invocation.
 *
 * 2. **WebSocket transport** — a `WebsocketProvider` connects to the
 *    y-websocket server, synchronising the Y.Doc with peers in the same room.
 *    The room name defaults to `DEFAULT_ROOM_ID` when an empty string is passed.
 *
 * 3. **Connection state** — `isConnected` tracks the WebSocket lifecycle
 *    (connecting → connected → disconnected). It drives the "Disconnected /
 *    Reconnecting" banner in the UI.
 *
 * 4. **E2E test hooks** — `__WS_PROVIDER__` and `__WS_CONNECTED__` are
 *    attached to `window` so Playwright tests can inspect the internal
 *    provider instance and connection status without reaching into React
 *    internals. They are cleaned up on unmount.
 *
 * 5. **Cleanup** — on unmount (or room change), the provider is destroyed,
 *    the Y.Doc is destroyed, and window hooks are removed.
 *
 * The `shapes` Y.Array<Shape> returned by this hook is the single source of
 * truth for the canvas. The canvas redraws whenever the array changes — there
 * is no local React state mirror of shapes. Consumers read directly from the
 * Y.Array and subscribe to its `observe` events for mutation-triggered repaints.
 */
import { DEFAULT_ROOM_ID, type Shape } from '@whiteboard/shared';
import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

export interface UseYDocResult {
  ydoc: Y.Doc | null;
  shapes: Y.Array<Shape> | null;
  provider: WebsocketProvider | null;
  awareness: WebsocketProvider['awareness'] | null;
  isReady: boolean;
  isConnected: boolean;
}

export function useYDoc(roomId: string, wsUrl: string): UseYDocResult {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const trimmedRoomId = roomId.trim().length > 0 ? roomId.trim() : DEFAULT_ROOM_ID;
    const shapesArray = ydoc.getArray<Shape>('shapes');
    const wsProvider = new WebsocketProvider(wsUrl, trimmedRoomId, ydoc, {
      connect: true,
    });

    const handleStatus = (event: { status: 'connected' | 'disconnected' | 'connecting' }): void => {
      setIsConnected(event.status === 'connected');
    };

    wsProvider.on('status', handleStatus);

    // Expose provider instance and connection status on window for E2E tests.
    // Playwright reads __WS_PROVIDER__ to inject awareness state and
    // __WS_CONNECTED__ to wait for WebSocket handshake before asserting.
    if (typeof window !== 'undefined') {
      (window as unknown as { __WS_PROVIDER__: WebsocketProvider }).__WS_PROVIDER__ = wsProvider;
      (window as unknown as { __WS_CONNECTED__: boolean }).__WS_CONNECTED__ = false;
    }

    setProvider(wsProvider);
    setIsReady(true);

    return () => {
      wsProvider.off('status', handleStatus);
      wsProvider.destroy();
      ydoc.destroy();
      setProvider(null);
      setIsReady(false);
      setIsConnected(false);
      if (typeof window !== 'undefined') {
        const w = window as unknown as { __WS_CONNECTED__?: boolean; __WS_PROVIDER__?: WebsocketProvider };
        delete w['__WS_CONNECTED__'];
        delete w['__WS_PROVIDER__'];
      }
      void shapesArray;
    };
  }, [roomId, wsUrl, ydoc]);

  // Keep E2E hook in sync with React connection state so tests can
  // await page.waitForFunction(() => window.__WS_CONNECTED__) for readiness.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as { __WS_CONNECTED__: boolean }).__WS_CONNECTED__ = isConnected;
  }, [isConnected]);

  const shapes = useShapesArray(provider, ydoc);

  return { ydoc, shapes, provider, awareness: provider?.awareness ?? null, isReady, isConnected };
}

/**
 * Extracts the Y.Array<Shape> from the Y.Doc once the provider is set.
 * Returns null while the provider is still initialising so consumers
 * (canvas redraw, toolbar, eraser) can guard against a missing array.
 * This Y.Array is the single source of truth — there is no local React
 * state mirror of shapes; the canvas repaints directly from it.
 */
function useShapesArray(provider: WebsocketProvider | null, ydoc: Y.Doc): Y.Array<Shape> | null {
  const [shapes, setShapes] = useState<Y.Array<Shape> | null>(null);

  useEffect(() => {
    const arr = ydoc.getArray<Shape>('shapes');
    setShapes(arr);
    return () => {
      setShapes(null);
    };
  }, [ydoc, provider]);

  return shapes;
}
