import { isShape, type Point, type Shape } from '@whiteboard/shared';
import { useCallback, useEffect, useState } from 'react';

import { useAwareness } from '../../hooks/useAwareness';
import { useYDoc } from '../../hooks/useYDoc';
import { useBoardStore } from '../../store/boardStore';
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

type ActiveShape =
  | { kind: 'pen'; id: string }
  | { kind: 'rect'; id: string }
  | { kind: 'triangle'; id: string }
  | { kind: 'circle'; id: string }
  | null;

export default function Board({ roomId, wsUrl }: BoardProps): JSX.Element {
  const { shapes, provider, isReady, isConnected } = useYDoc(roomId, wsUrl);
  const { users, setCursor, setTool, localUserId } = useAwareness(provider);
  const tool = useBoardStore((s) => s.tool);
  const color = useBoardStore((s) => s.color);
  const strokeWidth = useBoardStore((s) => s.strokeWidth);
  const zoom = useBoardStore((s) => s.zoom);
  const setZoom = useBoardStore((s) => s.setZoom);
  const boardSetTool = useBoardStore((s) => s.setTool);
  const boardSetColor = useBoardStore((s) => s.setColor);

  const [localShapes, setLocalShapes] = useState<Shape[]>([]);
  const [active, setActive] = useState<ActiveShape>(null);

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
    if (localUserId === null) return;
    const authorColor = localShapes.find((s) => s.authorId === localUserId)?.authorColor;
    if (authorColor === undefined) return;
    if (authorColor !== color) {
      boardSetColor(authorColor);
    }
  }, [localShapes, localUserId, color, boardSetColor]);

  const handlePointerDown = useCallback(
    (point: Point): void => {
      if (shapes === null || localUserId === null) return;
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

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      const factor = 1 + direction * 0.1;
      setZoom(zoom * factor);
    },
    [setZoom, zoom],
  );

  return (
    <div className="flex h-full w-full flex-col bg-board-surface">
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={handleWheel}
      >
        <div
          className="relative"
          data-testid="canvas-stack"
          data-zoom={zoom}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <Canvas
            shapes={localShapes}
            tool={tool}
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
        <ZoomBadge zoom={zoom} />
      </div>
    </div>
  );
}

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

function ZoomBadge({ zoom }: { zoom: number }): JSX.Element {
  return (
    <div
      className="pointer-events-none absolute bottom-3 right-4 z-40 rounded-full bg-gray-800/85 px-3 py-1 text-xs font-medium text-white shadow"
      data-testid="zoom-badge"
    >
      {Math.round(zoom * 100)}%
    </div>
  );
}
