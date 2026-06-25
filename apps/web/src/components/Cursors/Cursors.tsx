/**
 * Renders remote users' cursors as SVG arrow markers with name/tool labels,
 * overlaid on the canvas stack.
 *
 * A setInterval at 500ms triggers a re-render to check cursor age.
 * Cursors older than CURSOR_FADE_AFTER_MS (3s) are rendered at 20% opacity.
 * Each cursor is positioned absolutely using the world coordinates broadcast
 * via awareness state. The SVG path draws a standard arrow pointer shape.
 */
import { CURSOR_FADE_AFTER_MS, type Tool } from '@whiteboard/shared';
import { useEffect, useState } from 'react';


import type { RemoteUser } from '../../hooks/useAwareness';

export interface CursorsProps {
  users: RemoteUser[];
  localTool: Tool;
}

export default function Cursors({ users }: CursorsProps): JSX.Element {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const now = Date.now();
  return (
    <div className="pointer-events-none absolute inset-0 z-20" data-testid="cursors-layer">
      {users
        .filter((u) => u.cursor !== null)
        .map((u) => {
          if (u.cursor === null) return null;
          const age = now - u.lastSeen;
          const faded = age > CURSOR_FADE_AFTER_MS;
          return (
            <div
              key={u.clientId}
              data-testid="remote-cursor"
              data-client-id={u.clientId}
              className="absolute"
              style={{
                left: `${u.cursor.x}px`,
                top: `${u.cursor.y}px`,
                opacity: faded ? 0.2 : 1,
                transition: 'opacity 200ms ease',
                transform: 'translate(-1px, -1px)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L13 11 Z"
                  fill={u.color}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              <div
                className="mt-0.5 ml-3 inline-block rounded-md px-1.5 py-0.5 text-xs text-white shadow"
                style={{ background: u.color }}
              >
                {u.name} {u.tool === 'pen' ? '✏️' : u.tool === 'rect' ? '▭' : '⌫'}
              </div>
            </div>
          );
        })}
    </div>
  );
}
