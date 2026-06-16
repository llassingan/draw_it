# Collaborative Whiteboard

Real-time multi-user collaborative whiteboard built with React, Yjs, and TypeScript. Open the same room URL in two browsers and draw together — strokes and eraser actions sync over a WebSocket CRDT in real time, with presence (cursors + user list) on top.

## Quick start

```bash
pnpm install
./scripts/start.sh dev          # starts ws on :14045 and web on :14022
```

Open <http://localhost:14022> in two browser tabs, append `?room=foo` to the URL of one of them, and draw. Tabs on the same `/room=foo` see each other's strokes and cursors.

The canvas is **infinite** — pan with the ✋ tool, hold `Space` and drag, or middle-mouse drag. Zoom with `Ctrl/⌘ + scroll` (toward the cursor) or the `−` / `100%` / `+` toolbar buttons. The view is per-user: each tab has its own pan and zoom.

`./scripts/start.sh` writes PIDs and logs to `.runtime/`. `./scripts/stop.sh` kills both processes.

### Production build

```bash
./scripts/start.sh build       # vite build + vite preview
```

The production bundle is ~77 KB gzipped (React 45 KB + Yjs 22 KB + app 8 KB + CSS 3 KB).

## URLs

This deployment exposes the project on two domains pointed at this VPS:

| Service    | Domain                       | Local port |
| ---------- | ---------------------------- | ---------- |
| Web app    | `http://localhost`           | `14022`    |
| WebSocket  | `http://localhost`           | `14045`    |

The frontend automatically connects the WebSocket to the same hostname on port `14045`. So `staging.mahara.web.id` (port 14022) talks to `api-staging.mahara.web.id:14045`.

## Project layout

```
.
├── apps/
│   ├── web/                   # React + Vite frontend (port 14022)
│   │   ├── src/components/    # Canvas, Toolbar, Cursors, UserList, Board
│   │   ├── src/hooks/         # useYDoc, useAwareness
│   │   ├── src/store/         # zustand boardStore
│   │   ├── src/types/         # window.d.ts (test hooks)
│   │   ├── e2e/               # Playwright multi-user tests
│   │   └── scripts/smoke.mjs  # manual UI smoke test
│   └── ws/                    # y-websocket server (port 14045)
│       ├── src/index.ts       # WebSocketServer + setupWSConnection
│       └── Dockerfile         # multi-stage, node:20-alpine
├── packages/
│   └── shared/                # pure types + utils (zero React)
│       └── src/
│           ├── shapes.ts      # Shape union, type guards, validateShape
│           ├── colors.ts      # PALETTE, djb2-based authorColor
│           ├── hitTest.ts     # pen + rect hit detection
│           └── constants.ts   # canvas size, throttling, room ids
├── scripts/
│   ├── start.sh               # spawn both servers
│   └── stop.sh                # kill both servers
├── tsconfig.base.json         # strict TS for the whole monorepo
├── .eslintrc.json             # eslint 8 + TS-ESLint, max-warnings=0
└── pnpm-workspace.yaml        # apps/* + packages/*
```

See [docs/architecture.md](docs/architecture.md) for the data flow and CRDT topology.

## Scripts

| Command                          | What it does                                                |
| -------------------------------- | ----------------------------------------------------------- |
| `pnpm install`                   | Install all workspace deps                                  |
| `pnpm dev`                       | Run both ws and web in dev mode (concurrent)                |
| `pnpm build`                     | Build shared → ws → web for production                      |
| `pnpm test`                      | Run all unit tests (shared + web)                           |
| `pnpm test:coverage`             | Run unit tests with v8 coverage                             |
| `pnpm e2e`                       | Run Playwright multi-user tests (auto-starts dev servers)   |
| `pnpm typecheck`                 | `tsc --noEmit` for every package                            |
| `pnpm lint`                      | ESLint, zero warnings allowed                               |
| `pnpm format`                    | Prettier write                                              |
| `./scripts/start.sh [dev|build]` | Start ws (14045) + web (14022) as background processes      |
| `./scripts/stop.sh`              | Stop both                                                   |

## Tech stack

| Layer         | Tech                                       | Why                                                  |
| ------------- | ------------------------------------------ | ---------------------------------------------------- |
| Framework     | React 18 + Vite                            | Fast, mature test ecosystem                          |
| Language      | TypeScript 5 (strict)                      | Type safety across the monorepo                      |
| Canvas        | HTML Canvas 2D (raw)                       | Full control, no lib lock-in                         |
| State (local) | Zustand                                    | Tiny, no boilerplate, easy to test                   |
| State (shared)| Yjs + y-websocket                          | Battle-tested CRDT with awareness built in           |
| Transport     | WebSocket (y-websocket utils)              | Default Yjs transport, no custom protocol            |
| Styling       | Tailwind CSS 3                             | Fast utility classes, no global CSS fights           |
| Unit test     | Vitest + happy-dom                         | Vite-native, Jest-compatible API                     |
| E2E test      | Playwright                                 | Multi-context (multi-user) out of the box            |
| Lint/Format   | ESLint 8 + Prettier 3                      | Standard                                             |
| Package mgr   | pnpm 11                                    | Fast, disk-efficient workspaces                      |

## Data model

```ts
type Shape = PenStroke | RectShape | TriangleShape | CircleShape;

interface PenStroke {
  id: ShapeId;          // ULID
  type: 'pen';
  color: string;
  width: number;
  points: number[];     // flat [x0,y0,x1,y1,...] for Yjs perf
  authorId: string;
  authorColor: string;  // stable per author, hash(authorId) % PALETTE
  createdAt: number;
}

interface RectShape {
  id: ShapeId;
  type: 'rect';
  color: string;
  width: number;
  start: Point;
  end: Point;
  authorId: string;
  authorColor: string;
  createdAt: number;
}

interface TriangleShape {
  id: ShapeId;
  type: 'triangle';
  color: string;
  width: number;
  a: Point;             // base vertex 1
  b: Point;             // base vertex 2
  c: Point;             // apex (always above the base)
  authorId: string;
  authorColor: string;
  createdAt: number;
}

interface CircleShape {
  id: ShapeId;
  type: 'circle';
  color: string;
  width: number;
  center: Point;
  radius: number;
  authorId: string;
  authorColor: string;
  createdAt: number;
}
```

The Y.Doc structure is:

- `ydoc.getArray<Shape>('shapes')` — the only source of truth for drawings
- `ydoc.getMap('meta')` — room metadata (currently unused but reserved)
- `provider.awareness` — ephemeral presence (cursor, name, tool, color)

There is no local mirror of shapes in React state. The Y.Array is the only source of truth, and the canvas is repainted whenever the array changes.

## Performance rules

- **Pointermove** is throttled to one update per animation frame (`requestAnimationFrame`).
- **Awareness cursor** is throttled to 30 fps (33 ms) and skipped if the cursor moved < 2 px.
- **Canvas redraws** repaint the full canvas on every Y.Array change. With < 500 shapes this stays under 16 ms on a modern laptop.
- The React tree is **not** re-rendered on every shape change — the canvas is driven via a ref + a manual `useEffect` that redraws on array mutation.
- **View (pan + zoom)** is a CSS `transform: translate(panX, panY) scale(zoom)` on the canvas-stack wrapper with `transform-origin: 0 0`. The Y.Doc is never touched, so peers don't see your pan or zoom. Zoom range 10 % – 500 %. Pan has no bounds — the world is infinite.

## Concurrency

- Yjs is the single source of truth — no local state mirror.
- Erase = `Y.Array.delete(index, 1)`. Concurrent erases resolve automatically (CRDT).
- Author color is deterministic (`djb2(authorId) % PALETTE.length`) so the same client keeps the same color across reconnects.
- Awareness state auto-expires after 30 s of silence (Y.Doc default).

## Quality gates

| Gate                  | Tool          | Threshold                       |
| --------------------- | ------------- | ------------------------------- |
| TypeScript            | `tsc --noEmit`| 0 errors                        |
| ESLint                | `eslint .`    | 0 errors, 0 warnings            |
| Unit tests (shared)   | `vitest run`  | 52/52 pass, ≥ 80% line coverage |
| Unit tests (web)      | `vitest run`  | 99/99 pass (3 skipped on happy-dom wheel + panning-pointer test), ≥ 80% line coverage |
| E2E tests             | `playwright`  | 14/14 pass                      |
| Build                 | `vite build`  | bundle < 300 KB gzipped (~79 KB)|

## Testing

```bash
# All unit tests
pnpm test

# With coverage
pnpm test:coverage

# E2E (multi-user, multi-context, real WebSocket)
pnpm e2e
```

The E2E suite opens two browser contexts, draws a pen stroke as Alice, verifies Bob sees it within 500 ms, and confirms Bob can erase Alice's shape. Tests use different `room` IDs so they are hermetic.

## License

MIT
