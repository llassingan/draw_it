# Changelog

All notable changes to this project are documented here.
Format: [Semantic Versioning](https://semver.org/) + [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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

[Unreleased]: https://github.com/etedadd/whiteboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/etedadd/whiteboard/releases/tag/v0.1.0
