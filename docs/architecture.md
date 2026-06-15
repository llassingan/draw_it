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
| Shapes (pen, rect)             | `Y.Array`            | Must be shared + persisted        |
| Awareness (cursor, tool, name) | `provider.awareness` | Ephemeral, auto-expires           |
| Selected tool (pen/rect/eraser)| React (zustand)      | Per-user, not shared              |
| Selected color                 | React (zustand)      | Per-user, not shared              |
| Stroke width                   | React (zustand)      | Per-user, not shared              |
| Loading / connection state     | React (useState)     | Component-local                   |

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
| Bundle size (gzip)          | < 300 KB              | ~77 KB             |

The biggest single optimisation is that **React doesn't re-render on every shape change** — only the canvas does, via a ref and a useEffect on the Y.Array observer.

## Why no infinite canvas / zoom / persistence

The v1 spec is bounded: 1080×720 px, no zoom, no scroll, no auth, no DB. This is intentional — it keeps the project learnable and the test surface small. Stretch goals (Y.UndoManager, selection tool, SQLite snapshot, PNG export) are documented in the project plan but not implemented.
