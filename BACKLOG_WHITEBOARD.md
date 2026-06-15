# Backlog: Real-time Collaborative Whiteboard (Agent-Ready)

> **Companion to:** `PROJECT_PLAN_WHITEBOARD.md` (read that first for goals/scope)
> **Purpose:** Operational task breakdown for agent swarm execution
> **Format:** Each task = self-contained unit an agent can execute without clarification
> **Created:** Mon 2026-06-15

---

## 🎯 How to Use This File

When spawning an agent, copy the relevant task block. Each task includes:
- **What** to build (specific deliverable)
- **Where** (exact file paths)
- **Pre-reqs** (which tasks must finish first)
- **Verify** (exact command + expected output)
- **Constraints** (must-follow rules)
- **Spawn prompt template** (ready to paste)

**Dependency direction:** `T1 → T2 → T3-T8 (parallel) → T9-T10 (parallel) → T11-T12 (final)`

---

## 📊 Task Dependency Graph

```
T1 (monorepo setup)
    └─→ T2 (shared types)
            └─→ T3 (ws server)
            └─→ T4 (canvas + Y.Doc binding)
                    ├─→ T5 (pen tool)
                    ├─→ T6 (rect tool)
                    └─→ T7 (eraser)
                    └─→ T8 (awareness/cursors)
                            └─→ T9 (toolbar UI)
T2 ─→ T10 (unit tests, can run parallel w/ T4-T9)
T3 + T4-T9 done ─→ T11 (E2E collab tests)
All done ─→ T12 (README + final commit)
```

**Parallel lanes (after T2 done):**
- Lane A: T3 (ws server) ‖ T4 → T5 → T6 → T7 → T8 → T9
- Lane B: T10 (unit tests)
- Final: T11 → T12

---

## T1. Monorepo Setup

**Pre-reqs:** none

**Deliverable:** Empty monorepo skeleton that runs `pnpm install` clean.

**Files to create:**
```
whiteboard/
├── package.json                # root, private, "packageManager": "pnpm@9"
├── pnpm-workspace.yaml         # lists apps/* and packages/*
├── tsconfig.base.json          # strict mode, shared compiler options
├── .eslintrc.cjs               # extends airbnb-typescript/base
├── .prettierrc                 # 2-space, single quote, no semi
├── .gitignore                  # node_modules, dist, .DS_Store
├── .nvmrc                      # 20
├── README.md                   # placeholder
├── apps/
│   ├── web/                    # empty for now
│   └── ws/                     # empty for now
└── packages/
    └── shared/                 # empty for now
```

**Exact commands:**
```bash
mkdir -p whiteboard/{apps/web,apps/ws,packages/shared}
cd whiteboard
pnpm init
# (then add pnpm-workspace.yaml, tsconfig.base.json manually)
pnpm add -D typescript@5 @types/node eslint prettier
pnpm add -D -w  # workspace-level dev deps
```

**Verify:**
```bash
cd whiteboard
pnpm install
# Expected: no errors, lockfile created
```

**Constraints:**
- Node 20+
- pnpm 9+
- No yarn/npm lockfiles committed
- TypeScript 5.x strict mode enabled in `tsconfig.base.json`

---

## T2. Shared Types Package

**Pre-reqs:** T1

**Deliverable:** Compilable `@whiteboard/shared` package with shape definitions, validators, hit-test logic, color palette.

**Files to create:**
```
packages/shared/
├── package.json                # name: "@whiteboard/shared", main: "./dist/index.js"
├── tsconfig.json               # extends base
├── src/
│   ├── index.ts                # barrel export
│   ├── shapes.ts               # Shape union + type guards
│   ├── colors.ts               # palette + author color hash
│   ├── hitTest.ts              # point-in-shape logic
│   └── constants.ts            # DEFAULT_STROKE_WIDTH, COLORS array, etc
```

**Exact code spec (shapes.ts):**
```typescript
export type ShapeId = string;
export type Tool = 'pen' | 'rect' | 'eraser';

export interface Point { x: number; y: number; }

export interface BaseShape {
  id: ShapeId;
  authorId: string;
  authorColor: string;
  createdAt: number;
}

export interface PenStroke extends BaseShape {
  type: 'pen';
  color: string;
  width: number;
  points: number[]; // flat [x0,y0,x1,y1,...] for Yjs perf
}

export interface RectShape extends BaseShape {
  type: 'rect';
  color: string;
  width: number;
  start: Point;
  end: Point;
}

export type Shape = PenStroke | RectShape;

export const isPenStroke = (s: Shape): s is PenStroke => s.type === 'pen';
export const isRectShape = (s: Shape): s is RectShape => s.type === 'rect';

export function validateShape(input: unknown): Shape | null {
  // implement: check type field, required fields, types match
  // return Shape or null
}
```

**Exact code spec (hitTest.ts):**
```typescript
import { Shape, Point, isPenStroke, isRectShape } from './shapes';

/**
 * Returns true if point hits the shape.
 * For pen: hits if within `width/2 + 4`px of any segment.
 * For rect: hits if inside bounding box.
 */
export function hitTest(point: Point, shape: Shape): boolean;

export function hitTestAll(point: Point, shapes: Shape[]): number[] {
  // returns array of Y.Array indices that hit, in z-order (top-most last)
}
```

**Exact code spec (colors.ts):**
```typescript
export const PALETTE = [
  '#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
  '#9c36b5', '#0c8599', '#c2255c',
] as const;

export function authorColor(authorId: string): string {
  // hash authorId (djb2) → modulo PALETTE.length → return color
  // must be deterministic
}
```

**Verify:**
```bash
cd packages/shared
pnpm build
# Expected: dist/ folder created, no TS errors

cd ../..
pnpm -F @whiteboard/shared test
# (no test file yet, should pass trivially or be skipped)
```

**Constraints:**
- ZERO React imports allowed in this package
- All exports must be tree-shakeable (named exports only, no default)
- All functions pure, no side effects
- `validateShape` must handle malformed input gracefully (return null, not throw)

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard project. Read /home/angga/.openclaw/workspace/PROJECT_PLAN_WHITEBOARD.md sections 2, 5, 6 first.

Task: Build @whiteboard/shared package with shape types, hit-test, and color utils.

Files to create (with exact content per BACKLOG_WHITEBOARD.md T2):
- packages/shared/package.json
- packages/shared/tsconfig.json
- packages/shared/src/index.ts (barrel)
- packages/shared/src/shapes.ts (Shape union, type guards, validateShape)
- packages/shared/src/hitTest.ts (hitTest, hitTestAll)
- packages/shared/src/colors.ts (PALETTE, authorColor)
- packages/shared/src/constants.ts (DEFAULT_STROKE_WIDTH=2, TOOLS list, etc)

After implementing, run:
  cd packages/shared && pnpm build

Expected: dist/ created, zero TS errors. Report back with file list + build output.
```

---

## T3. WebSocket Server

**Pre-reqs:** T2

**Deliverable:** Runnable y-websocket server on port 1234 with healthcheck.

**Files to create:**
```
apps/ws/
├── package.json                # name: "@whiteboard/ws", type: "module", scripts: {dev: "tsx watch src/index.ts"}
├── tsconfig.json               # extends base
├── src/
│   └── index.ts                # wraps y-websocket utils
└── Dockerfile                  # multi-stage build, node:20-alpine
```

**Exact code spec (src/index.ts):**
```typescript
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { IncomingMessage } from 'http';

const PORT = Number(process.env.PORT ?? 1234);
const HOST = process.env.HOST ?? '0.0.0.0';

const wss = new WebSocketServer({ port: PORT, host: HOST });

wss.on('connection', (ws, req: IncomingMessage) => {
  const roomId = (req.url ?? '/').slice(1).split('?')[0] || 'default';
  console.log(`[ws] connection to room: ${roomId}`);
  setupWSConnection(ws, req, { gc: true });
});

wss.on('listening', () => {
  console.log(`[ws] listening on ws://${HOST}:${PORT}`);
});

wss.on('error', (err) => {
  console.error('[ws] error', err);
  process.exit(1);
});

process.on('SIGINT', () => { wss.close(); process.exit(0); });
process.on('SIGTERM', () => { wss.close(); process.exit(0); });
```

**Verify:**
```bash
cd apps/ws
pnpm install
pnpm dev
# In another terminal:
wscat -c ws://localhost:1234/test
# Expected: WebSocket connects, no error
# Ctrl+C the dev server, expected: graceful shutdown
```

**Constraints:**
- Must use `y-websocket/bin/utils` (battle-tested), not reimplement protocol
- Log every connection + disconnect with room name
- Graceful shutdown on SIGINT/SIGTERM
- Dockerfile must be multi-stage, final image <100MB
- CORS: allow all origins (dev only, document this in Dockerfile comment)

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard project. Read /home/angga/.openclaw/workspace/PROJECT_PLAN_WHITEBOARD.md section 4 (flow 4.1 User Join) and BACKLOG_WHITEBOARD.md T3.

Task: Build the WebSocket server using y-websocket utils.

Files to create:
- apps/ws/package.json (deps: ws, y-websocket, yjs; devDeps: tsx, @types/ws, @types/node)
- apps/ws/tsconfig.json
- apps/ws/src/index.ts (per BACKLOG spec)
- apps/ws/Dockerfile (multi-stage, node:20-alpine)

After implementing:
1. Run `cd apps/ws && pnpm install`
2. Run `pnpm dev` in background, test with `wscat -c ws://localhost:1234/test` in another terminal
3. Confirm connection works
4. Kill dev server, confirm graceful shutdown
Report: test output + Dockerfile size check (`docker images` after build, optional).
```

---

## T4. Canvas + Y.Doc Binding

**Pre-reqs:** T2

**Deliverable:** React component that mounts canvas, initializes Y.Doc, syncs shapes to Y.Array, re-renders on changes.

**Files to create:**
```
apps/web/
├── package.json                # deps: react, react-dom, zustand, yjs, y-websocket; devDeps: vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom
├── vite.config.ts              # base: "/", server: { port: 5173 }
├── tsconfig.json               # extends base, jsx: "react-jsx"
├── tsconfig.node.json
├── index.html                  # root div#root
├── src/
│   ├── main.tsx                # ReactDOM.createRoot
│   ├── App.tsx                 # mounts <Board roomId={...}/>
│   ├── components/
│   │   ├── Board/
│   │   │   ├── Board.tsx       # top-level: handles Y.Doc init, roomId from URL
│   │   │   ├── Board.css
│   │   │   └── Board.test.tsx
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx      # <canvas ref={...} onPointerDown/.../>
│   │   │   ├── renderer.ts     # pure draw function: renderShapes(ctx, shapes)
│   │   │   ├── renderer.test.ts
│   │   │   └── Canvas.css
│   │   ├── Toolbar/
│   │   │   ├── Toolbar.tsx     # placeholder buttons
│   │   │   └── Toolbar.css
│   │   └── Cursors/
│   │       ├── Cursors.tsx     # overlay div
│   │       └── Cursors.css
│   ├── hooks/
│   │   ├── useYDoc.ts          # returns { ydoc, shapes, awareness, isReady }
│   │   ├── useYDoc.test.ts
│   │   ├── useAwareness.ts     # returns { users, localUser, setCursor, setTool }
│   │   └── useTool.ts          # returns { tool, setTool, color, setColor }
│   ├── store/
│   │   └── boardStore.ts       # zustand: { tool, color, setTool, setColor }
│   └── types/
│       └── env.d.ts            # vite env types
```

**Exact code spec (useYDoc.ts):**
```typescript
import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Shape } from '@whiteboard/shared';

export interface UseYDocResult {
  ydoc: Y.Doc | null;
  shapes: Y.Array<Shape> | null;
  awareness: WebsocketProvider['awareness'] | null;
  isReady: boolean;
}

export function useYDoc(roomId: string, wsUrl: string): UseYDocResult {
  // 1. On mount: create Y.Doc, create WebsocketProvider(url, roomId, doc)
  // 2. Get ydoc.getArray<Shape>('shapes')
  // 3. Set isReady when provider 'status' event fires with 'connected'
  // 4. Cleanup on unmount: provider.destroy(), ydoc.destroy()
  // Return nulls until isReady === true
}
```

**Exact code spec (renderer.ts):**
```typescript
import { Shape, isPenStroke, isRectShape } from '@whiteboard/shared';

export function renderShapes(ctx: CanvasRenderingContext2D, shapes: Shape[]): void {
  // 1. Clear canvas (ctx.clearRect or fillRect with white)
  // 2. For each shape: draw based on type
  //    - pen: ctx.beginPath, moveTo first point, lineTo subsequent, stroke
  //    - rect: ctx.strokeRect(x, y, w, h) where x = min(start.x,end.x), w = |end.x-start.x|
  // 3. Always set ctx.lineCap = 'round', ctx.lineJoin = 'round' before drawing
}

export function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
}
```

**Canvas.tsx behavior:**
- On mount: get context, set canvas size to 1080x720 (or container size)
- Subscribe to Y.Array observe → re-render full canvas on change
- Pass pointer events down to parent (Board.tsx) via callbacks: onPointerDown, onPointerMove, onPointerUp
- For now, just log events (pen/rect/erase come in T5-T7)

**Verify:**
```bash
cd apps/web
pnpm install
pnpm dev
# Open http://localhost:5173
# Expected: white canvas, no console errors
# In DevTools Network tab: WS connection to ws://localhost:1234 visible
# If ws server not running, expect "WebSocket connection failed" in console (OK for now)
```

**Constraints:**
- Canvas re-render must be ≤16ms for 100 shapes (use profiling if unsure)
- Y.Doc is SINGLE source of truth — never mirror shapes in local React state
- Hooks must cleanup on unmount (no memory leaks, no zombie providers)
- TS strict, no `any` in public hook signatures
- All component files: PascalCase, all hooks: camelCase starting with `use`

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read PROJECT_PLAN_WHITEBOARD.md sections 3, 4, 5 and BACKLOG_WHITEBOARD.md T4.

Task: Bootstrap the React app with Vite, mount a canvas, bind it to a Y.Doc, render shapes from a Y.Array.

Files to create (per BACKLOG T4 spec):
- apps/web/package.json (deps: react@18, react-dom@18, zustand@4, yjs@13, y-websocket@2, @whiteboard/shared@workspace:*)
- apps/web/vite.config.ts
- apps/web/tsconfig.json, tsconfig.node.json
- apps/web/index.html
- apps/web/src/main.tsx, App.tsx
- apps/web/src/components/Board/Board.tsx + .css
- apps/web/src/components/Canvas/Canvas.tsx + renderer.ts + .css
- apps/web/src/components/Toolbar/Toolbar.tsx (placeholder) + .css
- apps/web/src/hooks/useYDoc.ts (with exact signature per BACKLOG)
- apps/web/src/store/boardStore.ts (zustand)
- apps/web/src/types/env.d.ts

After implementing:
1. `cd apps/web && pnpm install`
2. `pnpm dev`, open http://localhost:5173
3. Verify: white canvas renders, no console errors, WS connection attempt visible
Report: file list created, dev server status, any warnings.
```

---

## T5. Pen Tool

**Pre-reqs:** T4

**Deliverable:** User can freehand-draw with mouse, strokes appear in Y.Array, visible to all connected clients.

**Files to modify:**
- `apps/web/src/components/Board/Board.tsx` — wire up pointer events from Canvas to drawing logic
- `apps/web/src/components/Canvas/Canvas.tsx` — emit pointer events with normalized coordinates

**Files to create:**
- `apps/web/src/components/Canvas/drawPen.ts` — pure function that handles pen pointer events
- `apps/web/src/components/Canvas/drawPen.test.ts` — unit test
- `apps/web/src/components/Board/Board.test.tsx` — integration: simulate mouse events, assert Y.Array grows

**Exact behavior spec:**

`Canvas.tsx` changes:
- Add `onPointerDown`, `onPointerMove`, `onPointerUp` props (typed: `(e: PointerEvent, point: Point) => void`)
- Convert client coords → canvas coords using `getBoundingClientRect()`

`Board.tsx` changes:
- Maintain `currentStroke: PenStroke | null` state (NOT in Y.Doc until finalization)
- On pointerdown: create new PenStroke with id (ULID), authorId, authorColor, points: [x, y]
- On pointermove (if drawing): append point to currentStroke, push to local Y.Array
- On pointerup: clear currentStroke

**Critical:** Push to Y.Array in-place. Don't re-create Y.Array entries.

**Exact code spec (drawPen.ts):**
```typescript
import { PenStroke, Point } from '@whiteboard/shared';
import * as Y from 'yjs';

export function startPenStroke(
  shapes: Y.Array<PenStroke>,
  authorId: string,
  authorColor: string,
  point: Point,
  color: string,
  width: number,
): PenStroke {
  const stroke: PenStroke = {
    id: crypto.randomUUID(),
    type: 'pen',
    authorId,
    authorColor,
    createdAt: Date.now(),
    color,
    width,
    points: [point.x, point.y],
  };
  shapes.push([stroke]);
  return stroke;
}

export function extendPenStroke(
  shapes: Y.Array<PenStroke>,
  strokeId: string,
  point: Point,
): void {
  const arr = shapes.toArray();
  const idx = arr.findIndex(s => s.id === strokeId);
  if (idx === -1) return;
  const stroke = arr[idx];
  const updated: PenStroke = {
    ...stroke,
    points: [...stroke.points, point.x, point.y],
  };
  shapes.doc?.transact(() => shapes.delete(idx, 1));
  shapes.doc?.transact(() => shapes.insert(idx, [updated]));
}
```

**Verify:**
```bash
# Manual: open 2 browser tabs at http://localhost:5173?room=foo
# Tab 1: drag mouse across canvas
# Tab 2: same drawing appears in <500ms
# Expected: no console errors, smooth 60fps

# Automated:
cd apps/web
pnpm test
# Expected: drawPen.test.ts and Board.test.tsx pass
```

**Constraints:**
- Throttle pointermove to requestAnimationFrame (don't push on every event)
- Use `Y.Doc.transact()` to batch point updates
- Cleanup: if user disconnects mid-stroke, partial stroke should be visible (don't require pointerup)
- No memory leak: ensure pointer event listeners removed on unmount

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read PROJECT_PLAN_WHITEBOARD.md section 4.2 and BACKLOG_WHITEBOARD.md T5.

Task: Implement the freehand pen tool. User drags mouse → stroke appears in Y.Array → synced to all clients.

Deliverables (per BACKLOG T5):
- apps/web/src/components/Canvas/drawPen.ts (startPenStroke, extendPenStroke functions per spec)
- apps/web/src/components/Canvas/drawPen.test.ts (unit tests for both functions)
- Modify apps/web/src/components/Canvas/Canvas.tsx to emit pointer events with normalized coords
- Modify apps/web/src/components/Board/Board.tsx to handle pen drawing state + Y.Array updates
- apps/web/src/components/Board/Board.test.tsx (integration test)

After implementing:
1. `pnpm test` → all pen tests pass
2. `pnpm dev`, open 2 tabs, verify strokes sync in real-time
Report: test results, manual verification outcome, any perf concerns observed.
```

---

## T6. Rectangle Tool

**Pre-reqs:** T4, T5 (shares drawing state pattern)

**Deliverable:** User can click-drag to draw a rectangle outline.

**Files to create:**
- `apps/web/src/components/Canvas/drawRect.ts`
- `apps/web/src/components/Canvas/drawRect.test.ts`

**Files to modify:**
- `Board.tsx` — branch on `tool` from boardStore: if 'rect', use drawRect flow; if 'pen', use drawPen flow
- `Toolbar.tsx` — replace placeholder, add actual tool buttons (pen, rect, eraser — eraser disabled for now)

**Exact code spec (drawRect.ts):**
```typescript
import { RectShape, Point } from '@whiteboard/shared';
import * as Y from 'yjs';

export function startRect(
  shapes: Y.Array<RectShape>,
  authorId: string,
  authorColor: string,
  point: Point,
  color: string,
  width: number,
): RectShape;

export function updateRect(
  shapes: Y.Array<RectShape>,
  rectId: string,
  end: Point,
): void;
```

**Behavior:** On pointerdown, create rect with start=point, end=point (zero-size). On pointermove, update end. On pointerup, keep the rect (even if zero-size — user might've clicked by accident, but undo comes later).

**Verify:**
```bash
pnpm test
# drawRect tests pass

# Manual: select rect tool, drag on canvas, see rectangle outline
# Switch to pen tool, draw curve, switch back, draw rect — both should coexist
```

**Constraints:**
- Reuse same drawing state machine as T5 (currentShape ref, isDrawing flag)
- Rectangle must have a visible stroke even when start==end (maybe min 1px? — no, allow 0)
- No fill — outline only for v1

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read PROJECT_PLAN_WHITEBOARD.md section 4.3 and BACKLOG_WHITEBOARD.md T6.

Task: Implement rectangle tool. User clicks-and-drags → rectangle outline appears synced to all clients.

Files:
- apps/web/src/components/Canvas/drawRect.ts (startRect, updateRect)
- apps/web/src/components/Canvas/drawRect.test.ts
- Update apps/web/src/components/Board/Board.tsx to branch on tool
- Update apps/web/src/components/Toolbar/Toolbar.tsx with real buttons

Verify:
1. `pnpm test` → all tests pass
2. Manual: pen + rect tools both work, shapes coexist on canvas
Report: test results, screenshot or description of manual test.
```

---

## T7. Eraser

**Pre-reqs:** T4, T5, T6 (needs full drawing flow + hit-test from T2)

**Deliverable:** User can click/drag on existing shapes to delete them. Visible to all clients.

**Files to create:**
- `apps/web/src/components/Canvas/eraser.ts`
- `apps/web/src/components/Canvas/eraser.test.ts`

**Files to modify:**
- `Board.tsx` — when tool === 'eraser', pointerdown/move triggers hit-test + Y.Array.delete
- `Toolbar.tsx` — wire eraser button

**Exact code spec (eraser.ts):**
```typescript
import { Shape } from '@whiteboard/shared';
import * as Y from 'yjs';
import { hitTest, hitTestAll, Point } from '@whiteboard/shared';

export function eraseAtPoint(shapes: Y.Array<Shape>, point: Point): void {
  // 1. Get all shapes from Y.Array
  // 2. hitTestAll(point, shapes) → returns indices in z-order
  // 3. Delete top-most (last index) using shapes.delete(idx, 1)
  // 4. Wrap in Y.Doc.transact for atomicity
}
```

**Behavior:** On pointerdown, erase shapes at point. On pointermove (while button held), continuously erase. Cursor changes to crosshair when eraser is active (CSS).

**Verify:**
```bash
pnpm test
# eraser tests: shape under cursor gets deleted, multiple overlapping shapes → top one deleted

# Manual: 
# 1. Draw some shapes
# 2. Select eraser
# 3. Click on a shape → disappears
# 4. Drag across multiple shapes → all gone
# 5. Open 2 tabs: erase on tab 1 → tab 2 sees shapes disappear in real-time
```

**Constraints:**
- Eraser must hit-test on BOTH pen strokes AND rects
- For pen strokes, the hit zone is the stroke width + 4px tolerance
- Don't allow erasing while user is mid-draw (ignore eraser if isDrawing flag is true)
- CRDT-safe: Y.Array.delete is the right primitive; do NOT splice local state

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read PROJECT_PLAN_WHITEBOARD.md section 4.4 and BACKLOG_WHITEBOARD.md T7.

Task: Implement eraser tool. Click on a shape → it disappears, synced to all clients.

Files:
- apps/web/src/components/Canvas/eraser.ts (eraseAtPoint using hitTestAll from @whiteboard/shared)
- apps/web/src/components/Canvas/eraser.test.ts
- Update Board.tsx to handle eraser tool flow
- Update Toolbar.tsx
- Add CSS: eraser cursor is crosshair

Verify:
1. `pnpm test` → all eraser tests pass
2. Manual: draw shapes, switch to eraser, click+drag, verify sync to 2nd tab
Report: test results + manual test outcome.
```

---

## T8. Awareness / Remote Cursors

**Pre-reqs:** T4

**Deliverable:** Each user sees other users' cursors in real-time with their name label.

**Files to create:**
- `apps/web/src/hooks/useAwareness.ts`
- `apps/web/src/hooks/useAwareness.test.ts`
- `apps/web/src/components/Cursors/Cursors.tsx` (already stub in T4, fully implement)
- `apps/web/src/components/Cursors/Cursors.test.tsx`

**Exact code spec (useAwareness.ts):**
```typescript
import { useEffect, useState } from 'react';
import type { WebsocketProvider } from 'y-websocket';

export interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  tool: Tool;
}

export function useAwareness(provider: WebsocketProvider | null): {
  users: RemoteUser[];
  localUser: RemoteUser | null;
  setCursor: (point: Point | null) => void;
  setTool: (tool: Tool) => void;
} {
  // 1. Local state: localUser initialized with random name + hash color
  // 2. On provider ready: subscribe to 'change' event
  // 3. Map awareness.getStates() → RemoteUser[] (exclude self)
  // 4. Cleanup on unmount
}
```

**Behavior:**
- On mount: set local awareness state = { name: randomAdjectiveNoun(), color: authorColor(clientId), tool: 'pen', cursor: null }
- Throttle cursor updates to 30fps (33ms) to avoid WS spam
- Cursor fade-out: if cursor hasn't updated in 3s, render as hidden
- Render remote cursors as absolute-positioned divs over canvas, offset by canvas bounding rect

**Verify:**
```bash
pnpm test
# useAwareness tests pass

# Manual: 2 tabs, move mouse on tab 1 → see cursor on tab 2 with name
# Idle 3s → cursor fades
```

**Constraints:**
- Don't broadcast awareness on every pointermove — throttle to 33ms
- Don't broadcast if cursor position hasn't changed by >2px
- Use deterministic color from `authorColor(clientId)` so same user gets same color on reconnect
- Random name generator: adjective + animal (e.g., "BravePanda", "SwiftOtter"). NO duplicates — check against existing awareness states.

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read PROJECT_PLAN_WHITEBOARD.md section 4.5 and BACKLOG_WHITEBOARD.md T8.

Task: Implement remote cursor presence. Each user sees other users' cursors in real-time with name labels.

Files:
- apps/web/src/hooks/useAwareness.ts (per BACKLOG spec)
- apps/web/src/hooks/useAwareness.test.ts
- apps/web/src/components/Cursors/Cursors.tsx (full implementation)
- apps/web/src/components/Cursors/Cursors.test.tsx

Verify:
1. `pnpm test` → all tests pass
2. Manual: 2 tabs, move mouse, verify cursor sync with name
3. Verify 3s idle fade
Report: test results, manual verification.
```

---

## T9. Toolbar UI (Full)

**Pre-reqs:** T5, T6, T7, T8

**Deliverable:** Polished toolbar with tool buttons, color picker, user list.

**Files to create:**
- `apps/web/src/components/Toolbar/Toolbar.test.tsx`
- `apps/web/src/components/UserList/UserList.tsx`
- `apps/web/src/components/UserList/UserList.css`
- `apps/web/src/components/UserList/UserList.test.tsx`

**Files to modify:**
- `Toolbar.tsx` — full implementation
- `App.tsx` — include UserList in layout

**Toolbar spec:**
- Top-center fixed
- Left section: tool buttons (Pen 🖊, Rect ▭, Eraser ⌫) — active state highlighted
- Right section: color swatches (8 colors from PALETTE) — active state has ring border
- All buttons: 40x40px, rounded, hover/active states

**UserList spec:**
- Top-right fixed
- Pill per user: colored dot + name + tool emoji
- Stacked vertically if many users, scrollable if > 5

**Verify:**
```bash
pnpm test
# Toolbar + UserList tests pass
# Manual: toolbar shows selected tool/color, user list shows all connected users with correct colors
```

**Constraints:**
- Use Tailwind classes (already set up in T4 via Vite plugin)
- No external icon library — use unicode emoji or inline SVG
- Color picker uses PALETTE from @whiteboard/shared (single source of truth)
- UserList updates in <100ms when user joins/leaves (subscribe to awareness)

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read PROJECT_PLAN_WHITEBOARD.md section 4.6 and BACKLOG_WHITEBOARD.md T9.

Task: Build the polished toolbar (tools + colors) and user list component.

Files:
- apps/web/src/components/Toolbar/Toolbar.tsx (full impl, tool buttons + color picker)
- apps/web/src/components/Toolbar/Toolbar.test.tsx
- apps/web/src/components/UserList/UserList.tsx + .css
- apps/web/src/components/UserList/UserList.test.tsx
- Update apps/web/src/App.tsx to include UserList

Verify:
1. `pnpm test` → all tests pass
2. Manual: toolbar polished, color picker works, user list shows live users
Report: screenshot description or test output.
```

---

## T10. Unit Tests (Coverage Push)

**Pre-reqs:** T2 (testable in isolation)

**Note:** This task runs **in parallel** with T4-T9. Assign to a separate agent.

**Deliverable:** Unit test suite with ≥80% coverage on `src/` (excluding types).

**Target files to cover:**
- `src/hooks/useYDoc.ts` (mock Yjs, test lifecycle, cleanup)
- `src/hooks/useAwareness.ts` (mock provider, test throttling)
- `src/hooks/useTool.ts`
- `src/store/boardStore.ts` (test all zustand actions)
- `src/components/Canvas/renderer.ts` (test rendering with mock context)
- `src/components/Canvas/drawPen.ts`
- `src/components/Canvas/drawRect.ts`
- `src/components/Canvas/eraser.ts`

**Verify:**
```bash
cd apps/web
pnpm test:coverage
# Expected: All files in src/ except types/ have ≥80% line coverage
```

**Constraints:**
- Use Vitest (already set up via Vite)
- Test files co-located: `Foo.ts` ↔ `Foo.test.ts`
- Mock Yjs in hook tests (don't need real WS)
- Mock Canvas context with simple stub: `MockCanvasRenderingContext2D` class
- Don't test implementation details — test behavior

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read BACKLOG_WHITEBOARD.md T10.

Task: Write comprehensive unit tests for the app, target ≥80% line coverage.

Focus areas:
- All hooks (useYDoc, useAwareness, useTool)
- store/boardStore (zustand actions)
- Canvas helpers (renderer, drawPen, drawRect, eraser)
- Pure functions only — defer component tests to integration

Verify:
1. `cd apps/web && pnpm test:coverage`
2. Coverage report shows ≥80% on src/
Report: coverage summary table per file.
```

---

## T11. E2E Collaboration Tests

**Pre-reqs:** T3, T5, T6, T7, T8, T9 (all UI work done)

**Deliverable:** Playwright test suite covering critical multi-user scenarios.

**Files to create:**
```
apps/web/
├── playwright.config.ts        # baseURL: http://localhost:5173, webServer: vite dev
├── e2e/
│   ├── fixtures/
│   │   └── multiTab.ts         # helper: open N contexts, return pages[]
│   ├── collaboration.spec.ts   # 2-user sync, cursor visibility
│   ├── tools.spec.ts           # pen/rect/erase single-user
│   └── reconnect.spec.ts       # disconnect/reconnect Y.Doc state
```

**Exact test spec (collaboration.spec.ts):**
```typescript
import { test, expect } from '@playwright/test';
import { openTwoPages } from './fixtures/multiTab';

test('two users can draw together in real-time', async ({ browser }) => {
  const { alice, bob } = await openTwoPages(browser, 'room-e2e-1');
  
  // Alice draws a pen stroke
  await alice.mouse.move(100, 100);
  await alice.mouse.down();
  for (let i = 0; i < 20; i++) {
    await alice.mouse.move(100 + i * 10, 100 + i * 5);
  }
  await alice.mouse.up();
  
  // Bob should see the stroke within 500ms
  await expect(bob.locator('canvas')).toHaveScreenshot('alice-stroke.png', {
    maxDiffPixelRatio: 0.05,
  });
});

test('cursor of alice is visible on bobs screen', async ({ browser }) => {
  const { alice, bob } = await openTwoPages(browser, 'room-e2e-2');
  await alice.mouse.move(300, 300);
  await expect(bob.locator('[data-testid="remote-cursor"]')).toBeVisible({ timeout: 1000 });
});

test('bob can erase alices shape', async ({ browser }) => {
  const { alice, bob } = await openTwoPages(browser, 'room-e2e-3');
  // Alice draws, Bob erases, both verify shape is gone
  // ... (full spec)
});
```

**Multi-tab fixture (multiTab.ts):**
```typescript
import { Browser, Page } from '@playwright/test';

export async function openTwoPages(browser: Browser, roomId: string) {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const alice = await ctx1.newPage();
  const bob = await ctx2.newPage();
  await alice.goto(`/?room=${roomId}`);
  await bob.goto(`/?room=${roomId}`);
  await alice.waitForSelector('canvas');
  await bob.waitForSelector('canvas');
  // Wait for both to connect to WS
  await alice.waitForFunction(() => (window as any).__WS_CONNECTED__ === true);
  await bob.waitForFunction(() => (window as any).__WS_CONNECTED__ === true);
  return { alice, bob, cleanup: () => Promise.all([ctx1.close(), ctx2.close()]) };
}
```

**Verify:**
```bash
cd apps/web
pnpm e2e
# Expected: all specs pass
# Visual regression: snapshot diffs should be <5% pixel diff
```

**Constraints:**
- Use `page.evaluate()` to expose Y.Doc connection state to window for testability
- Use `toHaveScreenshot` for canvas comparisons
- Tests must be hermetic — different roomIds per test
- Mark flaky tests as `test.fixme()` rather than deleting
- CI mode: `pnpm e2e:ci` (no retries, fail fast)

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. Read PROJECT_PLAN_WHITEBOARD.md section 7.3 and BACKLOG_WHITEBOARD.md T11.

Task: Write Playwright E2E tests for multi-user collaboration scenarios.

Files:
- apps/web/playwright.config.ts
- apps/web/e2e/fixtures/multiTab.ts
- apps/web/e2e/collaboration.spec.ts (3+ tests)
- apps/web/e2e/tools.spec.ts (single-user tool flow)
- apps/web/e2e/reconnect.spec.ts

Verify:
1. `cd apps/web && pnpm e2e`
2. All tests pass
3. Update window globals in useYDoc to expose __WS_CONNECTED__ for testability
Report: spec results, any flaky tests, screenshot diff stats.
```

---

## T12. README + Final Polish

**Pre-reqs:** T1-T11 all complete

**Deliverable:** Production-ready README, demo gif, final commit.

**Files to create/modify:**
- `README.md` (root) — full project README
- `apps/web/README.md` — web-specific
- `apps/ws/README.md` — ws-specific
- `docs/architecture.md` — architecture diagram (ASCII art), data flow
- `docs/demo.gif` — 5-second screen recording of 2-user collaboration

**README structure (root):**
```markdown
# Collaborative Whiteboard

Real-time multi-user whiteboard built with React + Yjs.

## Quick Start
\`\`\`bash
pnpm install
pnpm dev   # starts web on :5173, ws on :1234 in parallel
\`\`\`

Open http://localhost:5173 in 2+ browser tabs. Draw together.

## Architecture
[link to docs/architecture.md]

## Scripts
- pnpm dev
- pnpm build
- pnpm test
- pnpm e2e
- pnpm lint
- pnpm typecheck

## Tech Stack
[table from PROJECT_PLAN section 2]

## Testing
[link to BACKLOG section 7]

## License
MIT
```

**Verify:**
```bash
# From clean clone
git clone <repo>
cd whiteboard
pnpm install
pnpm dev
# Open 2 tabs, verify works

# Run all tests
pnpm test
pnpm e2e
# All pass
```

**Spawn prompt template:**
```
You are working on a Yjs collaborative whiteboard. All implementation tasks are done.

Task: Write the README, architecture docs, capture a demo gif, and prepare the project for handoff.

Deliverables:
- Root README.md (per BACKLOG T12 spec)
- docs/architecture.md (data flow diagram in ASCII)
- docs/demo.gif (5s screen recording showing 2-user collab)
- Clean up: remove any console.log, fix any lint warnings

Verify:
1. `pnpm install && pnpm dev` from clean clone works
2. `pnpm test && pnpm e2e` all pass
3. `pnpm typecheck` 0 errors
4. `pnpm lint` 0 warnings
Report: final repo state, file count, lines of code, test count.
```

---

## 🔧 Common Agent Issues & Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Agent says "I need more info" | Read PROJECT_PLAN_WHITEBOARD.md first | Add to prompt: "Read both PLAN and BACKLOG files" |
| Agent picks wrong Yjs API | Used `Y.Map` instead of `Y.Array` | In T2 spec, link to Yjs docs explicitly |
| Agent over-engineers | Adds features not in scope | Reference PROJECT_PLAN section 1 (Non-goals) |
| Tests pass but app broken | Mocks too lenient | Add real-WS smoke test in T11 |
| Agent's code has `any` | Strict mode not enforced | Run `pnpm typecheck` in verify step |

---

## 📊 Total Work Estimate

| Task | Hours | Parallelizable? |
|---|---|---|
| T1 | 0.5 | No (gate) |
| T2 | 1.0 | No (gate) |
| T3 | 1.0 | Yes (Lane A) |
| T4 | 2.0 | No (gate for T5-T8) |
| T5 | 1.5 | Lane A |
| T6 | 1.0 | Lane A |
| T7 | 1.5 | Lane A |
| T8 | 1.5 | Lane A |
| T9 | 1.0 | Lane A (after T5-T8) |
| T10 | 2.0 | Yes (Lane B, parallel with T4-T9) |
| T11 | 2.0 | No (final) |
| T12 | 1.0 | No (final) |
| **Total (parallel)** | **~10-12h** | Same as project plan |

---

*Last updated: Mon 2026-06-15 16:52 UTC*
