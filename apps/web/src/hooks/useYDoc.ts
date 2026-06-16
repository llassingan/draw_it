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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as { __WS_CONNECTED__: boolean }).__WS_CONNECTED__ = isConnected;
  }, [isConnected]);

  const shapes = useShapesArray(provider, ydoc);

  return { ydoc, shapes, provider, awareness: provider?.awareness ?? null, isReady, isConnected };
}

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
