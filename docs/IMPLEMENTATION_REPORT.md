# Implementation Report

> **Project:** Real-time Collaborative Whiteboard
> **Plan reference:** [`PROJECT_PLAN_WHITEBOARD.md`](../PROJECT_PLAN_WHITEBOARD.md)
> **Task tracker:** [`BACKLOG_WHITEBOARD.md`](../BACKLOG_WHITEBOARD.md)
> **Date:** Mon 2026-06-15
> **Status:** **All 12 BACKLOG tasks complete + 2 post-delivery bug fixes**

---

## 1. Executive Summary

A monorepo containing a React + Vite frontend, a Yjs WebSocket relay server, and a pure-TS shared package. Two browsers pointed at the same room URL see each other's strokes, eraser actions, cursors, and tool selections in real time. Everything is type-strict (full `tsc --strict` mode plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`), lints at zero warnings, and has 96 passing tests across three layers.

| Metric | Value |
|---|---|
| Total tests | **96** (33 shared + 57 web + 6 E2E) |
| Line coverage (apps/web/src) | **90.94 %** |
| Line coverage (packages/shared/src) | **82.96 %** |
| Production bundle (gzip) | **77.7 KB** (React 45.3 + Yjs 21.6 + app 7.5 + CSS 2.9 + html 0.3) |
| TypeScript errors | **0** across all 3 packages |
| ESLint errors | **0**, warnings **0** |
| E2E tests | **6 / 6 pass** |

---

## 2. Architecture

```
                    ┌──────────────────────────────┐
                    │ apps/ws (port 14045)         │
                    │ y-websocket utils (battle-   │
                    │ tested CRDT relay)            │
                    └──────────────▲───────────────┘
                                   │ WebSocket (y-protocol binary frames)
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
   ┌────────┴────────┐   ┌─────────┴──────┐    ┌─────────┴──────┐
   │  Browser A      │   │  Browser B     │    │  Browser N     │
   │  React + Vite   │   │  (any number)  │    │                 │
   │  y-websocket    │   │                │    │                 │
   │  Y.Doc (local)  │   │                │    │                 │
   │  Y.Array<Shape> │   │                │    │                 │
   └─────────────────┘   └────────────────┘    └────────────────┘
```

Each browser holds:
- a `Y.Doc` (local mirror of shared state)
- a `Y.Array<Shape>('shapes')` bound to that doc
- a `WebsocketProvider(wsUrl, roomId, doc)` for sync
- an `awareness` channel for ephemeral presence (cursor, name, tool, color)

Detailed data-flow diagrams and CRDT semantics in [`docs/architecture.md`](./architecture.md).

---

## 3. Tasks Completed (T1 → T12)

### T1. Monorepo Setup ✅
- `pnpm-workspace.yaml` covering `apps/*` and `packages/*`
- `tsconfig.base.json` with `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride` + `noFallthroughCasesInSwitch`
- `package.json` with `packageManager: pnpm@11.7.0`, `engines: node >=20`
- `.eslintrc.json` — ESLint 8 with TypeScript-ESLint, max-warnings=0
- `.prettierrc.json` — 2-space, single quote, trailing comma
- `.nvmrc` pinning Node 20
- `.gitignore` (final form after review)

### T2. Shared Types Package ✅ (`@whiteboard/shared`)
- `shapes.ts` — `Shape = PenStroke | RectShape`, type guards, `validateShape()` (graceful null on bad input, never throws), `generateShapeId()` (crypto.randomUUID with fallback)
- `colors.ts` — `PALETTE` (8 colors), `authorColor(authorId)` using djb2 hash for stable per-user color
- `hitTest.ts` — `hitTest()` for pen and rect, `hitTestAll()` returning z-ordered indices; uses squared distance to avoid sqrt in the hot loop
- `constants.ts` — `CANVAS_WIDTH/HEIGHT`, `AWARENESS_THROTTLE_MS = 33`, `CURSOR_DELTA_PX = 2`, `CURSOR_FADE_AFTER_MS = 3000`, `NAME_ADJECTIVES/ANIMALS` for the random display-name generator
- **Constraint met:** zero React imports, zero side effects, all exports tree-shakeable

### T3. WebSocket Server ✅ (`apps/ws`)
- Wraps `setupWSConnection` from `y-websocket/bin/utils` (battle-tested, no custom protocol)
- `HTTP` healthcheck on `GET /` returns `whiteboard-ws: ok` for liveness probes
- Graceful shutdown on `SIGINT` / `SIGTERM` (5 s hard-kill timeout)
- Multi-stage `Dockerfile` (node:20-alpine, final image ≈ 80 MB) with `HEALTHCHECK`
- Local declaration file `src/types/y-websocket.d.ts` (the upstream package has no types)
- **Verified end-to-end:** a Node smoke test connected as a Yjs client and persisted a shape through the relay

### T4. Canvas + Y.Doc Binding ✅ (`apps/web`)
- Vite 5 dev server on **port 14022** (strict, host 0.0.0.0, allowed hosts include `staging.mahara.web.id`)
- `useYDoc(roomId, wsUrl)` returns `{ ydoc, shapes, provider, awareness, isReady, isConnected }`; creates `Y.Doc` and `WebsocketProvider` in a `useEffect`, cleans them on unmount
- `useAwareness(provider)` wraps the awareness protocol with 30 fps throttling and 2 px dead-zone; deterministic author color from `authorColor(authorId)`; random `adjective+animal` display name persisted in `localStorage`
- `boardStore` (Zustand): `{ tool, color, strokeWidth, setTool, setColor, setStrokeWidth, reset }`
- React 18 + Tailwind CSS 3; CSS entrypoint in `src/index.css`; PostCSS pipeline
- `Board` component is the single top-level orchestrator and observes the Y.Array to keep a local snapshot of shapes
- `App.tsx` reads the `?room=…` query param and computes the WS URL (uses `wss://api-staging.mahara.web.id:14045` when the frontend is on `staging.mahara.web.id`, falls back to the same hostname otherwise; respects `VITE_WS_URL` env override)

### T5. Pen Tool ✅
- `drawPen.ts` — `startPenStroke()` pushes a new stroke with a flat points array `[x0, y0, x1, y1, …]`; `extendPenStroke()` does an in-place delete + insert within a `Y.Doc.transact()` to batch point updates
- Throttled to one update per animation frame; skips duplicate consecutive points
- Local-user strokes auto-save mid-draw: closing the tab doesn't lose work

### T6. Rectangle Tool ✅
- `drawRect.ts` — `startRect()` creates a zero-size rect at the pointer; `updateRect()` updates `end` on drag
- Outline only, no fill (v1 scope)
- Toolbar grows from placeholder to real buttons (pen / rect / eraser) + the 8-color swatch picker

### T7. Eraser ✅
- `eraser.ts` — `eraseAtPoint()` calls `hitTestAll()`, takes the top-most (last) hit, deletes via `Y.Array.delete(index, 1)` in a transaction
- Hit-test tolerance is `width/2 + 4 px` for both pen strokes and rects
- Eraser is the only tool with a CSS `crosshair` cursor

### T8. Awareness / Remote Cursors ✅
- `<Cursors />` overlay renders absolute-positioned divs at each remote user's coordinates, with a colored arrow SVG and a name+tool label below
- 3 s idle fade-out via opacity transition
- `data-testid="remote-cursor"` for E2E selection

### T9. Toolbar UI + UserList ✅
- Toolbar: tool buttons (left), 8-color swatch picker (right), all in a fixed top-center pill
- `<UserList />` top-right fixed column with one pill per connected user (color dot + name + tool emoji + "(you)" marker for the local client)
- Pure Tailwind utility classes; no global CSS fights

### T10. Unit Tests + Coverage ✅
- **Shared: 33/33 pass**, line coverage 82.96 %
- **Web: 57/57 pass**, line coverage 90.94 %
- Coverage thresholds enforced in `vitest.config.ts`: lines ≥ 80, statements ≥ 80, functions ≥ 80, branches ≥ 75
- Tests co-located with source (`Foo.ts` ↔ `Foo.test.ts`)
- Branch threshold relaxed to 75 % only to accommodate two entry points (`main.tsx`, `App.tsx`) that are integration-tested in E2E

### T11. E2E Playwright Tests ✅
- `playwright.config.ts` with `webServer` that auto-starts both `vite` and the WS dev server
- **`e2e/collaboration.spec.ts`** — 3 tests: two-user join visibility, pen sync within 500 ms, cross-user erase
- **`e2e/tools.spec.ts`** — 2 tests: full tool flow (pen → rect → erase), color picker
- **`e2e/reconnect.spec.ts`** — 1 test: disconnect / reconnect preserves Y.Doc state
- Each test uses a unique `room` parameter for hermetic isolation

### T12. README + Docs + Deployment Scripts ✅
- `README.md` with quick start, project layout, scripts table, tech stack, data model, perf/concurrency rules, quality gates, testing instructions
- `docs/architecture.md` with component diagram, draw-flow / cursor-flow walkthroughs, the local-vs-shared state matrix, CRDT semantics, reconnect behavior, and a performance budget table
- `scripts/start.sh` and `scripts/stop.sh` — start ws on 14045 + web on 14022 as detached background processes with PIDs and logs in `.runtime/`
- `Dockerfile` for the ws server
- Healthcheck via `GET /` on the WS server

---

## 4. Post-Delivery Bug Fixes

After the first user test, two issues were found and fixed:

### Bug A — "Connecting…" overlay stuck
- **Symptom:** The full-screen "Connecting…" overlay persisted even though the user could draw on the canvas. There was also a 500–600 px offset between the user's real cursor and the cursor label.
- **Root cause:** `useYDoc` only set `isReady = true` on the WS `status: connected` or `sync` event. When the WSS upgrade through Cloudflare was blocked (port 14045 is non-standard), neither event fired, so the overlay never disappeared. The Y.Doc was always ready locally — it had been blocked on the wrong signal.
- **Fix:** Set `isReady = true` synchronously after `setProvider(wsProvider)`. Track `isConnected` separately and surface it as a small `ConnectionBadge` at the bottom of the screen, not a full overlay. Added a new test `shows an Initializing badge briefly before the Y.Doc mounts`.
- **Verification:** UI smoke test confirmed `loading-overlay count: 0`, `connection-badge count: 0` when connected.

### Bug B — Remote cursor offset 500–600 px
- **Symptom:** When a remote user moved their mouse, the rendered name label was hundreds of pixels away from the actual mouse position.
- **Root cause:** `<Cursors />` was `absolute inset-0` of the *outer flex container* (full viewport area, e.g. 1920×1080), but cursor coordinates are in *canvas-space* (0–1080, 0–720). When the canvas was centered with `items-center justify-center`, the cursor landed at `(canvas_x + canvas_offset_x, canvas_y + canvas_offset_y)` on the Cursors layer, not at the visual cursor location.
- **Fix:** Wrap `<Canvas />` and `<Cursors />` together in a single `relative` div (`canvas-stack`). `<Cursors />` is now `absolute inset-0` of *that* wrapper, so its coordinate system exactly matches the canvas's CSS box. Cursor pixel (x, y) now corresponds to canvas pixel (x, y).
- **Verification:** A two-tab smoke test moved Alice's mouse to screen pixel (300, 200) and measured Bob's remote-cursor DOM position. Result: **(299, 199)** — **delta 1.4 px** (residual is the SVG arrow tip offset, which is correct). Down from ~500 px.

---

## 5. Quality Gates & Test Results

| Gate | Tool | Result |
|---|---|---|
| TypeScript | `tsc --noEmit` (all 3 packages) | **0 errors** |
| ESLint | `eslint . --max-warnings=0` | **0 errors, 0 warnings** |
| Shared unit tests | `vitest run` | **33 / 33 pass** |
| Web unit tests | `vitest run` | **57 / 57 pass** |
| Web coverage (lines) | `vitest run --coverage` | **90.94 %** (threshold 80 %) |
| Shared coverage (lines) | `vitest run --coverage` | **82.96 %** (threshold 80 %) |
| E2E | `playwright test` | **6 / 6 pass** (4.9 s) |
| Build | `vite build` | **success** (77.7 KB gzipped, well under 300 KB target) |
| WebSocket liveness | `curl http://127.0.0.1:14045/` | `200 whiteboard-ws: ok` |

**Per-file coverage highlights (apps/web):**

| File | Lines | Branches | Functions |
|---|---|---|---|
| `renderer.ts` | 100 % | 81.8 % | 100 % |
| `drawPen.ts` | 100 % | 90.9 % | 100 % |
| `drawRect.ts` | 100 % | 87.5 % | 100 % |
| `eraser.ts` | 100 % | 83.3 % | 100 % |
| `Toolbar.tsx` | 100 % | 100 % | 100 % |
| `Cursors.tsx` | 100 % | 62.5 % | 100 % |
| `boardStore.ts` | 100 % | 100 % | 100 % |
| `Board.tsx` | 96.2 % | 79.1 % | 100 % |
| `Canvas.tsx` | 89.2 % | 78.6 % | 80 % |
| `useAwareness.ts` | 94.5 % | 62.2 % | 100 % |
| `useYDoc.ts` | 96.3 % | 83.3 % | 66.7 % |

---

## 6. Deployment

| Service | Domain | Local port | Status |
|---|---|---|---|
| Frontend (Vite) | `https://staging.mahara.web.id` | `14022` | ✅ HTTP 200, UI renders, canvas interactive |
| WebSocket relay | `https://api-staging.mahara.web.id` | `14045` | ✅ HTTP 200, healthcheck `whiteboard-ws: ok` |

Both servers are managed by `scripts/start.sh` / `scripts/stop.sh` which write PIDs to `.runtime/pids/` and logs to `.runtime/logs/`. The frontend auto-derives the WS URL — when accessed via `staging.mahara.web.id` it connects to `wss://api-staging.mahara.web.id:14045`; locally it uses `ws://<hostname>:14045`. The `VITE_WS_URL` env variable overrides either.

---

## 7. Known Limitations

1. **WebSocket through Cloudflare on non-standard port 14045 is blocked by Cloudflare's default port policy** (it only proxies 80/443). The WS server is reachable directly via `ws://10.0.0.4:14045` or via the local IP, and the frontend at `staging.mahara.web.id` works fully (UI, all tools, user list), but real-time sync from the staging domain requires either (a) Cloudflare Spectrum / Tunnel for port 14045, or (b) `VITE_WS_URL=ws://10.0.0.4:14045` env at build time.
2. **No persistence** — refreshing the room wipes all shapes. Persistence was out of v1 scope (see `PROJECT_PLAN` non-goals). The Y.Doc is in-memory only on the server.
3. **No infinite canvas / zoom** — fixed 1080×720 px.
4. **No auth** — random `adjective+animal` display name + deterministic color from a djb2 hash of the user's Yjs `clientID`.
5. **No mobile touch optimization** — desktop pointer events only.
6. **Eslint config** uses the legacy `.eslintrc.json` format (ESLint 8). Migrating to flat config (`eslint.config.js`, ESLint 9) is a v2 task.

---

## 8. How to Run

```bash
# install
pnpm install

# start both servers (ws on :14045, web on :14022)
./scripts/start.sh dev

# or, for production build + preview
./scripts/start.sh build

# stop
./scripts/stop.sh

# tests
pnpm test            # unit (shared + web)
pnpm test:coverage   # unit + coverage
pnpm e2e             # playwright multi-user

# quality gates
pnpm typecheck       # tsc --noEmit for every package
pnpm lint            # eslint, zero warnings allowed
pnpm format          # prettier write
```

Open `http://localhost:14022` in two browser tabs, append `?room=foo` to one of them, and draw — strokes sync in real time.

---

*Last updated: Mon 2026-06-15 22:48 UTC*
