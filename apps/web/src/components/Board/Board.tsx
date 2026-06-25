/**
 * Main UI orchestrator for the collaborative whiteboard.
 *
 * Wires together:
 *  - Yjs data flow: shapes Y.Array observer → localShapes[] → Canvas render
 *  - Awareness: cursor coordinate + active-tool broadcast to other peers
 *  - Panning: Space+drag, middle-click, or the dedicated pan tool
 *  - Zoom: Ctrl/⌘+scroll toward the cursor (not the center)
 *
 * The Y.Array observer snapshots shapes into local state on every change so
 * the Canvas re-renders from stable React props rather than raw Yjs objects.
 *
 * Panning uses setPointerCapture for reliable tracking even when the pointer
 * leaves the viewport element.
 *
 * ConnectionBadge shows offline / initializing state.
 * ZoomBadge shows the current zoom percentage with a click-to-reset action.
 */
import {
  ZOOM_MAX,
  ZOOM_MIN,
  isShape,
  type Point,
  type Shape,
} from '@whiteboard/shared';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAwareness } from '../../hooks/useAwareness';
import { useYDoc } from '../../hooks/useYDoc';
import { useBoardStore, panForZoomToPoint, type View } from '../../store/boardStore';
import Canvas from '../Canvas/Canvas';
import { startCircle, updateCircle } from '../Canvas/drawCircle';
import { startPenStroke, extendPenStroke } from '../Canvas/drawPen';
import { startRect, updateRect } from '../Canvas/drawRect';
import { startTriangle, updateTriangle } from '../Canvas/drawTriangle';
import { eraseAtPoint } from '../Canvas/eraser';
import Cursors from '../Cursors/Cursors';
import Toolbar from '../Toolbar/Toolbar';
import UserList from '../UserList/UserList';

export interface BoardProps {
  roomId: string;
  wsUrl: string;
}

// ActiveShape tracks the shape currently being drawn (null when idle).
// The kind discriminates the drawing operation; the id maps to a Yjs shape.
type ActiveShape =
  | { kind: 'pen'; id: string }
  | { kind: 'rect'; id: string }
  | { kind: 'triangle'; id: string }
  | { kind: 'circle'; id: string }
  | null;

// PanState tracks the pointer ID and start positions for panning —
// client coordinates for calculating delta, pan coordinates for the view offset.
interface PanState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
}

// Maps viewport interaction state to the CSS cursor shown on the canvas
// (crosshair when drawing, grab when pan-ready, grabbing while panning).
const VIEWPORT_CURSOR_BY_MODE: Record<'drawing' | 'pan-ready' | 'panning', string> = {
  drawing: 'crosshair',
  'pan-ready': 'grab',
  panning: 'grabbing',
};

export default function Board({ roomId, wsUrl }: BoardProps): JSX.Element {
  const { shapes, provider, isReady, isConnected } = useYDoc(roomId, wsUrl);
  const { users, setCursor, setTool, localUserId } = useAwareness(provider);
  const tool = useBoardStore((s) => s.tool);
  const color = useBoardStore((s) => s.color);
  const strokeWidth = useBoardStore((s) => s.strokeWidth);
  const view = useBoardStore((s) => s.view);
  const setView = useBoardStore((s) => s.setView);
  const setPan = useBoardStore((s) => s.setPan);
  const resetView = useBoardStore((s) => s.resetView);
  const boardSetTool = useBoardStore((s) => s.setTool);

  const [localShapes, setLocalShapes] = useState<Shape[]>([]);
  const [active, setActive] = useState<ActiveShape>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const panRef = useRef<PanState | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Snapshot the Y.Array into local React state on every change
  // so the Canvas renders from plain JS objects, not raw Yjs types.
  useEffect(() => {
    if (shapes === null) return;
    const update = (): void => {
      const next: Shape[] = [];
      shapes.forEach((s) => {
        if (isShape(s)) next.push(s);
      });
      setLocalShapes(next);
    };
    update();
    const observer = (): void => update();
    shapes.observe(observer);
    shapes.observeDeep(observer);
    return () => {
      shapes.unobserve(observer);
      shapes.unobserveDeep(observer);
    };
  }, [shapes]);

  useEffect(() => {
    if (localUserId === null) return;
    if (provider === null) return;
    boardSetTool(tool);
    setTool(tool);
  }, [tool, boardSetTool, setTool, localUserId, provider]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (target === null) return false;
      const el = target as HTMLElement;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable === true
      );
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return;
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setIsSpaceDown(true);
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return;
      setIsSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handlePointerDown = useCallback(
    (point: Point): void => {
      if (shapes === null || localUserId === null) return;
      if (tool === 'pan') return; // pan is handled by the viewport, not the canvas
      if (tool === 'pen') {
        const stroke = startPenStroke(shapes, localUserId, color, point, color, strokeWidth);
        setActive({ kind: 'pen', id: stroke.id });
      } else if (tool === 'rect') {
        const rect = startRect(shapes, localUserId, color, point, color, strokeWidth);
        setActive({ kind: 'rect', id: rect.id });
      } else if (tool === 'triangle') {
        const tri = startTriangle(shapes, localUserId, color, point, color, strokeWidth);
        setActive({ kind: 'triangle', id: tri.id });
      } else if (tool === 'circle') {
        const c = startCircle(shapes, localUserId, color, point, color, strokeWidth);
        setActive({ kind: 'circle', id: c.id });
      } else if (tool === 'eraser') {
        eraseAtPoint(shapes, point);
      }
    },
    [shapes, tool, color, strokeWidth, localUserId],
  );

  const handlePointerMove = useCallback(
    (point: Point): void => {
      if (shapes === null) return;
      if (active === null) {
        if (tool === 'eraser') eraseAtPoint(shapes, point);
        return;
      }
      if (active.kind === 'pen') {
        extendPenStroke(shapes, active.id, point);
      } else if (active.kind === 'rect') {
        updateRect(shapes, active.id, point);
      } else if (active.kind === 'triangle') {
        updateTriangle(shapes, active.id, point);
      } else if (active.kind === 'circle') {
        updateCircle(shapes, active.id, point);
      }
    },
    [shapes, tool, active],
  );

  const handlePointerUp = useCallback((): void => {
    setActive(null);
  }, []);

  const handleCursorMove = useCallback(
    (point: Point): void => {
      setCursor(point);
    },
    [setCursor],
  );

  // Zooms toward the cursor, not the viewport center.
  // Uses panForZoomToPoint to keep the point under the cursor stable.
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      const factor = 1 + direction * 0.1;
      const { view: current } = useBoardStore.getState();
      const oldZoom = current.zoom;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldZoom * factor));
      if (newZoom === oldZoom) return;
      const wrapper = viewportRef.current;
      if (wrapper === null) {
        setView({ zoom: newZoom });
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const nextPan = panForZoomToPoint(current, newZoom, cursor);
      setView({ panX: nextPan.panX, panY: nextPan.panY, zoom: newZoom });
    },
    [setView],
  );

  const handleViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const wantPan = tool === 'pan' || isSpaceDown || event.button === 1;
      if (!wantPan) return;
      event.preventDefault();
      const { view: current } = useBoardStore.getState();
      panRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: current.panX,
        startPanY: current.panY,
      };
      setIsPanning(true);
      // setPointerCapture keeps the pointer tracked reliably even
      // when it moves outside the viewport element.
      const targetEl = event.target as Element | null;
      if (targetEl !== null && typeof targetEl.setPointerCapture === 'function') {
        try {
          targetEl.setPointerCapture(event.pointerId);
        } catch {
          // Some elements don't support pointer capture; safe to ignore.
        }
      }
    },
    [tool, isSpaceDown],
  );

  const handleViewportPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const pan = panRef.current;
      if (pan === null) return;
      if (event.pointerId !== pan.pointerId) return;
      const dx = event.clientX - pan.startClientX;
      const dy = event.clientY - pan.startClientY;
      setPan(pan.startPanX + dx, pan.startPanY + dy);
    },
    [setPan],
  );

  const handleViewportPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const pan = panRef.current;
      if (pan === null) return;
      if (event.pointerId !== pan.pointerId) return;
      panRef.current = null;
      setIsPanning(false);
      const targetEl = event.target as Element | null;
      if (targetEl !== null && typeof targetEl.releasePointerCapture === 'function') {
        try {
          targetEl.releasePointerCapture(event.pointerId);
        } catch {
          // Safe to ignore.
        }
      }
    },
    [],
  );

  const isPanReady = tool === 'pan' || isSpaceDown;
  const viewportMode: 'drawing' | 'pan-ready' | 'panning' = isPanning
    ? 'panning'
    : isPanReady
      ? 'pan-ready'
      : 'drawing';
  const canvasCursor = VIEWPORT_CURSOR_BY_MODE[viewportMode];

  return (
    <div className="flex h-full w-full flex-col bg-board-surface">
      <div
        ref={viewportRef}
        className="board-viewport relative flex-1 overflow-hidden"
        data-testid="board-viewport"
        data-pan-mode={viewportMode}
        onWheel={handleWheel}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerUp}
      >
        <div
          className="absolute inset-0"
          data-testid="canvas-stack"
          data-zoom={view.zoom}
          data-pan-x={view.panX}
          data-pan-y={view.panY}
          style={{
            transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          <Canvas
            shapes={localShapes}
            tool={tool}
            panX={view.panX}
            panY={view.panY}
            zoom={view.zoom}
            cursor={canvasCursor}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onCursorMove={handleCursorMove}
          />
          <Cursors users={users} localTool={tool} />
        </div>
        <UserList users={users} localUserId={localUserId} />
        <Toolbar />
        <ConnectionBadge isConnected={isConnected} isReady={isReady} />
        <ZoomBadge view={view} onReset={resetView} />
      </div>
    </div>
  );
}

/** Shows offline / initializing / syncing state. Hidden when ready and connected. */
function ConnectionBadge({ isConnected, isReady }: { isConnected: boolean; isReady: boolean }): JSX.Element | null {
  if (isReady && isConnected) return null;
  return (
    <div
      className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-800/85 px-3 py-1 text-xs font-medium text-white shadow"
      data-testid="connection-badge"
    >
      {!isReady
        ? 'Initializing…'
        : isConnected
          ? 'Syncing with peers…'
          : 'Working offline — local changes will sync when peers connect'}
    </div>
  );
}

/** Shows the current zoom percentage. Click to reset view (zoom + pan). */
function ZoomBadge({ view, onReset }: { view: View; onReset: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onReset}
      title="Reset view (zoom + pan)"
      data-testid="zoom-badge"
      className="pointer-events-auto absolute bottom-3 right-4 z-40 rounded-full bg-gray-800/85 px-3 py-1 text-xs font-medium text-white shadow transition hover:bg-gray-700"
    >
      {Math.round(view.zoom * 100)}%
    </button>
  );
}
