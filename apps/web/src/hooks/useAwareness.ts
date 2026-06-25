/**
 * useAwareness — ephemeral multi-user presence hook.
 *
 * Manages real-time presence data (cursor position, display name, colour,
 * active tool) via the Yjs awareness protocol. Unlike Y.Doc data, awareness
 * state is NOT persisted to the CRDT document — it is broadcast to peers over
 * the WebSocket and **auto-expires after 30 seconds of silence** (the Yjs
 * default). This keeps presence lightweight and ephemeral.
 *
 * Key behaviours:
 * - **Cursor throttling**: cursor broadcasts are capped at ~30 fps
 *   (AWARENESS_THROTTLE_MS) and skipped when movement is under 2 px
 *   (CURSOR_DELTA_PX) to avoid flooding the WebSocket channel.
 * - **Pending cursor**: between throttle windows the latest cursor position is
 *   captured in a pending ref and flushed on the next timer tick, so the last
 *   position is never lost.
 * - **Tool changes**: broadcast immediately (no throttle) because tool switches
 *   are infrequent and latency-sensitive.
 * - **Stable identity**: `getOrCreateUserId` persists a UUID in localStorage so
 *   the same browser keeps the same author colour across sessions.
 * - **Friendly names**: `randomDisplayName` generates fun names like
 *   "BravePanda" on first join.
 */
import {
  AWARENESS_THROTTLE_MS,
  CURSOR_DELTA_PX,
  authorColor,
  type Point,
  type Tool,
} from '@whiteboard/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebsocketProvider } from 'y-websocket';


export interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
  cursor: Point | null;
  tool: Tool;
  lastSeen: number;
}

export interface UseAwarenessResult {
  users: RemoteUser[];
  localUser: RemoteUser | null;
  localUserId: string | null;
  setCursor: (point: Point | null) => void;
  setTool: (tool: Tool) => void;
}

interface AwarenessState {
  user?: { name: string; color: string; tool: Tool };
  cursor?: Point | null;
}

const STORAGE_USER_ID_KEY = 'whiteboard:userId';

function generateUserId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Persist a UUID in localStorage so the same browser keeps the same
// author colour across sessions. Falls back to an in-memory UUID during SSR.
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return generateUserId();
  const existing = window.localStorage.getItem(STORAGE_USER_ID_KEY);
  if (existing !== null && existing.length > 0) return existing;
  const next = generateUserId();
  window.localStorage.setItem(STORAGE_USER_ID_KEY, next);
  return next;
}

// Generate a friendly two-word display name (e.g. "BravePanda") by
// picking a random adjective and animal name.
function randomDisplayName(): string {
  const adjectives = [
    'Brave', 'Swift', 'Calm', 'Eager', 'Mighty', 'Clever', 'Lucky', 'Gentle',
    'Bold', 'Witty', 'Cosmic', 'Mystic', 'Sunny', 'Cosy', 'Frosty', 'Stellar',
  ];
  const animals = [
    'Panda', 'Otter', 'Fox', 'Wolf', 'Hawk', 'Bear', 'Lynx', 'Owl',
    'Falcon', 'Dolphin', 'Tiger', 'Eagle', 'Raven', 'Koala', 'Moose', 'Whale',
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)] ?? 'Brave';
  const animal = animals[Math.floor(Math.random() * animals.length)] ?? 'Panda';
  return `${adj}${animal}`;
}

export function useAwareness(provider: WebsocketProvider | null): UseAwarenessResult {
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [localUser, setLocalUser] = useState<RemoteUser | null>(null);
  const userIdRef = useRef<string>(getOrCreateUserId());
  const lastCursorRef = useRef<Point | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const pendingCursorRef = useRef<Point | null>(null);
  const timerRef = useRef<number | null>(null);

  const broadcastNow = useCallback(
    (cursor: Point | null): void => {
      if (provider === null) return;
      const state: AwarenessState = provider.awareness.getLocalState() as AwarenessState | null ?? {};
      const next: AwarenessState = {
        ...state,
        user: state.user ?? { name: randomDisplayName(), color: authorColor(userIdRef.current), tool: 'pen' },
        cursor,
      };
      provider.awareness.setLocalState(next);
      lastBroadcastRef.current = Date.now();
      lastCursorRef.current = cursor;
      pendingCursorRef.current = null;
    },
    [provider],
  );

  useEffect(() => {
    if (provider === null) return;
    const clientId = provider.awareness.clientID;
    const local: RemoteUser = {
      clientId,
      name: randomDisplayName(),
      color: authorColor(userIdRef.current),
      cursor: null,
      tool: 'pen',
      lastSeen: Date.now(),
    };
    setLocalUser(local);
    broadcastNow(null);

    // Reads the full awareness state snapshot from the provider and maps
    // it to RemoteUser[] for the cursor overlay and user list components.
    // Fires on every awareness change event (local or remote).
    const refresh = (): void => {
      const states = provider.awareness.getStates() as Map<number, AwarenessState>;
      const list: RemoteUser[] = [];
      states.forEach((state, id) => {
        if (state.user === undefined) return;
        list.push({
          clientId: id,
          name: state.user.name,
          color: state.user.color,
          cursor: state.cursor ?? null,
          tool: state.user.tool,
          lastSeen: Date.now(),
        });
      });
      setUsers(list);
      const me = states.get(clientId);
      if (me !== undefined) {
        setLocalUser({
          clientId,
          name: me.user?.name ?? local.name,
          color: me.user?.color ?? local.color,
          cursor: me.cursor ?? null,
          tool: me.user?.tool ?? 'pen',
          lastSeen: Date.now(),
        });
      }
    };
    refresh();
    provider.awareness.on('change', refresh);
    return () => {
      provider.awareness.off('change', refresh);
    };
  }, [provider, broadcastNow]);

  // Broadcast cursor position to peers with two guards:
  // 1. Skip if movement < CURSOR_DELTA_PX (2 px) to reduce noise.
  // 2. Throttle to AWARENESS_THROTTLE_MS (~30 fps).
  //
  // Between throttle windows the latest position is stored in
  // pendingCursorRef. A setTimeout fires once per window to flush it,
  // so the last cursor position is never dropped.
  const setCursor = useCallback(
    (point: Point | null): void => {
      if (provider === null) return;
      const now = Date.now();
      const last = lastBroadcastRef.current;
      const lastPoint = lastCursorRef.current;
      if (point !== null && lastPoint !== null) {
        const dx = point.x - lastPoint.x;
        const dy = point.y - lastPoint.y;
        if (dx * dx + dy * dy < CURSOR_DELTA_PX * CURSOR_DELTA_PX) return;
      }
      if (now - last >= AWARENESS_THROTTLE_MS) {
        broadcastNow(point);
        return;
      }
      pendingCursorRef.current = point;
      if (timerRef.current === null) {
        const delay = Math.max(0, AWARENESS_THROTTLE_MS - (now - last));
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          if (pendingCursorRef.current !== null || lastCursorRef.current !== null) {
            broadcastNow(pendingCursorRef.current);
          }
        }, delay);
      }
    },
    [provider, broadcastNow],
  );

  // Tool changes are broadcast immediately — no throttle needed because
  // tool switches are infrequent (user-initiated clicks, not mousemove).
  const setTool = useCallback(
    (tool: Tool): void => {
      if (provider === null) return;
      const state = (provider.awareness.getLocalState() as AwarenessState | null) ?? {};
      const next: AwarenessState = {
        ...state,
        user: state.user ?? {
          name: randomDisplayName(),
          color: authorColor(userIdRef.current),
          tool,
        },
        cursor: state.cursor ?? null,
      };
      if (next.user !== undefined) {
        next.user = { ...next.user, tool };
      }
      provider.awareness.setLocalState(next);
    },
    [provider],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    users,
    localUser,
    localUserId: localUser?.clientId !== undefined ? String(localUser.clientId) : userIdRef.current,
    setCursor,
    setTool,
  };
}
