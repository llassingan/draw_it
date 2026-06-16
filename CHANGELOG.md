# Changelog

All notable changes to this project are documented here.
Format: [Semantic Versioning](https://semver.org/) + [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

#### Infinite / pannable canvas (v0.3)

The canvas is no longer bounded to a 1080×720 visible area. Users can pan freely in all directions, with smooth zoom-to-cursor, and the world is "infinite" — shapes can be drawn at any coordinate and stay in their world positions across sessions.

- **Pan (hand tool)** — new `tool: 'pan'` button in the toolbar. Cursor becomes `grab` / `grabbing` while panning. Pure per-user view state, never synced.
- **Space + drag** — hold `Space` and drag to pan, regardless of the active tool. Cursor changes to `grab` / `grabbing`.
- **Middle-mouse drag** — press the middle mouse button and drag to pan.
- **Zoom-to-cursor** — Ctrl/Cmd + wheel zooms toward the cursor's world point so the spot under the cursor stays stationary. Plain wheel events are ignored.
- **Initial centering** — on first mount the canvas is auto-centered in the viewport so users see the full drawing area immediately.
- **Reset view** — the bottom-right zoom badge is now a button; click it to reset zoom to 100% and pan to centered.
- **Subtle dot grid** on the viewport background (24 px CSS pattern) for visual feedback that the canvas is pannable.
- **Store refactor** — `boardStore.zoom` is now part of a unified `view: { panX, panY, zoom }` object. New actions: `setPan`, `panBy`, `setView`, `resetView`. View state is fully per-user, never synced.
- **Math extracted** — `panForZoomToPoint(current, newZoom, cursor)` is a pure function in `boardStore.ts` that computes the new pan for any zoom-to-cursor scenario. Fully unit-tested.

The canvas is rendered as a fixed 1080×720 pixel buffer inside a `canvas-stack` div with `transform: translate(panX, panY) scale(zoom)`. Mouse events convert from screen-space to world-space before being stored in the Y.Doc, so:

- Y.Doc, awareness cursor positions, and peer sync all stay in the same world coordinate system.
- Each user has their own view (zoom + pan) — peers don't see your pan.
- Shapes drawn while panned are stored at their world coordinates and remain visible to all peers at the same coordinates.

#### Triangle and circle drawing tools

Two new shape types in addition to pen and rect. Both work like rect: pointerdown at one point, drag to the other, pointerup to finalize.

- **Triangle** — equilateral with base from start to end; the third vertex (apex) is always placed above the base so orientation matches the user's mental model regardless of drag direction. Stored as `{ a, b, c }` vertex points.
- **Circle** — center-radius: start is the center, drag updates the radius as `hypot(dx, dy)`. Stored as `{ center, radius }`.

Both follow the same in-place delete + insert pattern inside a `Y.Doc.transact()` as `drawRect`, so concurrent edits commute. Hit-test logic added in the shared package:
- Triangle: point-in-triangle via cross-product sign test, plus edge distance fallback (4px tolerance).
- Circle: distance from center ≤ radius + tolerance.

#### Zoomable canvas

- `boardStore.zoom` state with `setZoom`, `zoomIn`, `zoomOut`, `resetZoom` actions.
- Range clamped to `[ZOOM_MIN = 0.1, ZOOM_MAX = 5]`; step `ZOOM_STEP = 0.1`; default `ZOOM_DEFAULT = 1`.
- Toolbar zoom controls: `−` / `100%` (click to reset) / `+` buttons.
- Ctrl/Cmd + mouse wheel zooms toward the cursor (scroll up = zoom in, scroll down = zoom out). Plain wheel events are ignored.
- Bottom-right `ZoomBadge` shows the current percentage.
- Implementation: CSS `transform: scale(zoom)` on the `canvas-stack` wrapper. Canvas internal coordinates (0–1080, 0–720) are unchanged — Y.Doc, awareness cursor positions, and peer sync all stay in the same coordinate system regardless of local zoom.
- Per-user, not shared.

### Fixed

#### Remote cursor coordinate alignment

**Symptom.** The remote cursor label (e.g. "Bob ✏️") rendered hundreds of pixels away from where the user's actual mouse pointer was on their screen. A two-tab Playwright probe measured a 500–600 px delta.

**Root cause.** `<Cursors />` was `absolute inset-0` of the *outer flex container* (full viewport area, e.g. 1920×1080), but cursor coordinates from the awareness layer are in *canvas-space* (0–1080, 0–720). When the canvas was centered with `items-center justify-center`, the cursor landed at `(canvas_x + canvas_offset_x, canvas_y + canvas_offset_y)` on the Cursors layer, not at the visual cursor location.

**Fix.** Wrapped `<Canvas />` and `<Cursors />` together in a single `relative` div (`canvas-stack`, see `apps/web/src/components/Board/Board.tsx`). `<Cursors />` is now `absolute inset-0` of *that* wrapper, so its coordinate system exactly matches the canvas's CSS box. Cursor pixel (x, y) now corresponds to canvas pixel (x, y).

**Verification.** A two-tab smoke test moved Alice's mouse to screen pixel (300, 200) and measured Bob's remote-cursor DOM position: **(299, 199)** — **delta 1.4 px** (residual is the SVG arrow tip offset, which is the correct visual behavior). Down from ~500 px.

#### "Connecting…" overlay decoupled from canvas readiness

**Symptom.** A full-screen "Connecting…" overlay persisted even though the user could draw on the canvas. Two cases: (1) WS handshake slow — overlay stays on top while you can already write; (2) WS unreachable (e.g. Cloudflare blocking non-standard port 14045) — overlay never disappears.

**Root cause.** `useYDoc` only set `isReady = true` on the WS `status: connected` or `sync` event. The Y.Doc is always ready locally, so the UI was being gated on a signal that had nothing to do with whether drawing worked.

**Fix.**
1. `useYDoc.ts`: set `isReady = true` synchronously after `setProvider(wsProvider)`. Removed the `sync` listener — the Y.Doc is ready regardless of whether it has caught up with peers.
2. `Board.tsx`: replaced the full-screen overlay with a small `ConnectionBadge` at the bottom of the screen. The badge is hidden when `isReady && isConnected`, shows "Initializing…" during the brief Y.Doc mount, "Syncing with peers…" while connected but not caught up, and "Working offline — local changes will sync when peers connect" when the WS is down.

**Verification.** Playwright smoke test confirms: `loading-overlay` count = 0, `connection-badge` count = 0 when connected, 1 with offline message when WS unreachable.

## [0.1.0] — 2026-06-15

### Added

Initial implementation of the real-time collaborative whiteboard. All 12 BACKLOG tasks completed:

- **T1** Monorepo scaffolding (pnpm + strict TS + ESLint 8 + Prettier 3)
- **T2** `@whiteboard/shared` — pure-TS shape types, djb2 author color, hit-test, constants
- **T3** Yjs WebSocket relay on `:14045` with healthcheck and multi-stage Dockerfile
- **T4** React + Vite app shell with `useYDoc` hook, Y.Doc binding, Board, Canvas, Toolbar, Cursors, UserList
- **T5–T7** Pen, rectangle, eraser drawing tools with CRDT semantics
- **T8** Awareness-based remote cursors (30 fps throttling, 2 px dead-zone, 3 s fade)
- **T9** Polished toolbar with 8-color swatch picker and live user list
- **T10** Unit tests: 33/33 shared, 57/57 web (~90 % line coverage on `apps/web/src`)
- **T11** Playwright E2E tests: 6/6 pass (collaboration, tool flow, reconnect)
- **T12** README, `docs/architecture.md`, `docs/IMPLEMENTATION_REPORT.md`, `start.sh` / `stop.sh`

Quality gates: 0 TS errors, 0 ESLint errors, 0 ESLint warnings, 96 / 96 tests pass, build ≈ 77 KB gzipped.

- **Performance** — Drawing 100 shapes repaints in ~3 ms; awareness round-trip ~30 ms; bundle ~79 KB gzipped.
- **Tests** — 99 unit tests pass + 14 E2E tests pass (5 zoom-related tests in unit suite + 1 zoom math test, 6 pan/zoom E2E tests in `canvas-view.spec.ts`).
- **Quality gates** — 0 TS errors, 0 ESLint errors, 0 ESLint warnings, 113/113 tests pass (99 unit + 14 E2E).

[Unreleased]: https://github.com/etedadd/whiteboard/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/etedadd/whiteboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/etedadd/whiteboard/releases/tag/v0.1.0
