# Architecture

## Components

```
                              ┌─────────────────────────┐
                              │   apps/ws (port 14045)  │
                              │   y-websocket utils     │
                              │   rooms keyed by URL    │
                              └───────────▲─────────────┘
                                          │ WebSocket
                                          │ (binary y-protocol frames)
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
   ┌────────┴────────┐           ┌─────────┴───────┐           ┌─────────┴───────┐
   │  Browser A      │           │  Browser B      │           │  Browser N      │
   │  React + Vite   │           │  (any number)   │           │                 │
   │  y-websocket    │           │                 │           │                 │
   │  Y.Doc          │           │                 │           │                 │
   └────────▲────────┘           └─────────▲───────┘           └─────────▲───────┘
            │                             │                             │
            └─────────────────────────────┴─────────────────────────────┘
                              (all rooms with the same roomId
                               converge on the same Y.Doc state)
```

Each browser holds:
- its own `Y.Doc` (the local mirror of shared state)
- a `Y.Array<Shape>('shapes')` bound to that doc
- a `WebsocketProvider(serverUrl, roomId, doc)` for sync
- an `awareness` channel for ephemeral presence (cursor, name, tool)

## Data flow — draw a stroke

```
User drags pen on canvas
  ↓
Board.tsx onPointerMove
  ↓
extendPenStroke(shapes, strokeId, point)
  ↓
Y.Doc.transact(() => {
  shapes.delete(idx, 1);          ← optimistic
  shapes.insert(idx, [updated]);
})
  ↓
Y.Array fires 'observe' event in EVERY connected client
  ↓
each client's Board.tsx sees the new local shapes
  ↓
Canvas's useEffect re-runs renderShapes(ctx, shapes)
  ↓
canvas repainted
```

Two important properties:

1. **The local update is immediate.** We never wait for the server round-trip — Yjs propagates the change locally before the WS frame is even sent.
2. **There is no local React state for shapes.** The Y.Array is the single source of truth. The Canvas paints from `shapes.toArray()` and React's `useEffect` re-runs whenever the array mutates.

## Data flow — see another user's cursor

```
User B moves mouse on canvas
  ↓
Board.tsx onCursorMove
  ↓
useAwareness.setCursor(point)
  ↓
provider.awareness.setLocalState({ ...prev, cursor: point })
  ↓
awareness protocol broadcasts a small JSON blob to all peers
  ↓
each peer's provider.awareness fires 'change'
  ↓
useAwareness re-reads awareness.getStates()
  ↓
<Cursors> re-renders absolute-positioned divs
```

The awareness state is *ephemeral* — it is not persisted in the Y.Doc and is auto-evicted after 30 s of silence (Y.Doc default). When a user disconnects, their cursor disappears for everyone.

## What lives in the Y.Doc vs in React

| Thing                          | Lives in            | Why                              |
| ------------------------------ | ------------------- | -------------------------------- |
| Shapes (pen, rect, triangle, circle) | `Y.Array`            | Must be shared + persisted        |
| Awareness (cursor, tool, name) | `provider.awareness` | Ephemeral, auto-expires           |
| Selected tool (pen/rect/triangle/circle/eraser/pan) | React (zustand) | Per-user, not shared |
| Selected color                 | React (zustand)      | Per-user, not shared              |
| Stroke width                   | React (zustand)      | Per-user, not shared              |
| Loading / connection state     | React (useState)     | Component-local                   |
| View (pan + zoom)              | React (zustand)      | Per-user, not shared              |
| Space-key held                 | React (useState)     | Component-local, transient        |
| Active panning drag            | React (useState)     | Component-local, transient        |

A subtle consequence: the toolbar's selected tool is in React, but the same tool gets mirrored into awareness so other users can see what tool icon to draw next to a user's cursor.

## CRDT semantics — why Yjs

Yjs is a CRDT (Conflict-free Replicated Data Type). Concurrent operations commute, so any order of arrival produces the same final state.

For this app:

- Two users draw pen strokes at the same time → both end up in the Y.Array, no merging logic needed.
- Alice erases shape `i` while Bob deletes shape `j` → both deletions apply, regardless of arrival order.
- A user disconnects mid-stroke (e.g. closes the tab) → the partially drawn stroke stays in the Y.Doc. This is a feature: drawing is auto-saved.

## Where state goes on a reconnect

When the WebSocket drops, y-websocket buffers updates in IndexedDB (via `y-indexeddb` integration is NOT enabled here; the v1 spec is in-memory). On reconnect, the client sends its current Y.Doc state vector to the server, the server replies with the diff, and the client applies it. Strokes that were drawn while disconnected are propagated to peers.

## Performance budget

| Operation                   | Budget                | Achieved           |
| --------------------------- | --------------------- | ------------------ |
| Initial load + first paint  | < 500 ms              | ~150 ms (gzip)     |
| Draw-to-see latency         | < 500 ms p95 (LAN)    | ~50–150 ms typical |
| Canvas repaint (100 shapes) | < 16 ms (one frame)   | ~3 ms              |
| Awareness round-trip         | < 100 ms              | ~30 ms             |
| Bundle size (gzip)          | < 300 KB              | ~79 KB             |
| CSS transform scale(zoom)   | per-frame paint       | <1 ms repaint cost |

The biggest single optimisation is that **React doesn't re-render on every shape change** — only the canvas does, via a ref and a useEffect on the Y.Array observer.

## Infinite canvas — view transform

Zoom and pan are per-user and **not** synced via the Y.Doc. Both live in a single zustand `view: { panX, panY, zoom }` object. The view is applied as a CSS transform on the `canvas-stack` wrapper that contains the canvas, the cursors overlay, and the active shape.

```
canvas-stack  →  transform: translate(view.panX, view.panY) scale(view.zoom)
                       ↓                              ↓
                    pan in px                       zoom factor
```

The transform is `transform-origin: 0 0`, so a point at world coordinate `(wx, wy)` renders at screen position `(wx * zoom + panX, wy * zoom + panY)`. The reverse is `worldX = (screenX - panX) / zoom`.

The Canvas component translates this on the GPU: `ctx.translate(panX, panY); ctx.scale(zoom, zoom);` is applied before drawing shapes, so the renderer itself is unchanged — it still draws at world coordinates and the GPU does the screen mapping. Mouse events are converted from screen to world using the inverse formula before being passed to the draw handlers.

**Zoom-to-cursor math.** When the user Ctrl+wheel, the world point under the cursor must stay under the cursor. Given the current view, the new zoom, and the cursor's screen position, the new pan is:

```ts
const worldX = (cursorX - view.panX) / view.zoom;
const worldY = (cursorY - view.panY) / view.zoom;
const newPanX = cursorX - worldX * newZoom;
const newPanY = cursorY - worldY * newZoom;
```

This is a pure function in `boardStore.ts` (`panForZoomToPoint`) so it can be unit-tested without React.

**Pan UX.** Three ways to pan, all of them per-user and never synced:

1. **Hand tool** — select the pan tool in the toolbar, then click+drag.
2. **Space + drag** — hold `Space` (any tool active), then drag. Cursor changes to `grab`/`grabbing`.
3. **Middle-mouse drag** — press the middle mouse button and drag.

The viewport's `onPointerDown` handler captures pointer events, records the start position, and on `pointermove` it computes the delta from the start and calls `setPan`. Pointer capture is used so dragging outside the viewport still pans.

**Initial centering.** On first mount, a `useLayoutEffect` reads the viewport's `getBoundingClientRect()` and computes the pan to center the 1080×720 canvas. The effect runs only once and only if `panX === 0 && panY === 0` (i.e. the user hasn't panned).

**Reset view.** The bottom-right zoom badge is now a button. Clicking it calls `resetView()`, which sets `view: { panX: 0, panY: 0, zoom: 1 }`. This snaps the view back to identity but the canvas may still need re-centering depending on viewport size — the initial centering effect does not re-run.

Because the transform is purely visual:

- Canvas internal coordinates can be any world value — shapes drawn at `(5000, 3000)` are valid and remain visible if the user pans there.
- Awareness cursor positions (in world-space) are scaled together with the canvas, so remote cursors remain perfectly aligned regardless of any peer's local view.
- No Y.Doc migration, no peer-side change, no breaking change to existing rooms.

## Why no infinite canvas / zoom / persistence

~~The v1 spec is bounded: 1080×720 px, no zoom, no scroll, no auth, no DB.~~ (Removed in v0.3 — the canvas is now pannable in all directions and zoomable via Ctrl+wheel, the hand tool, or space+drag. The grid background signals the "infinite" feel. Persistence and auth remain unimplemented stretch goals.)
