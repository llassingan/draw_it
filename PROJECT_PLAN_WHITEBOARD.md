# Project Plan: Real-time Collaborative Whiteboard

> **Status:** Draft v1.0
> **Owner:** Bal (etedadd)
> **Created:** Mon 2026-06-15
> **Target:** Weekend project (Sat–Sun, ~12-16h work)
> **Difficulty:** Mid–Senior

---

## 1. 🎯 Vision & Goals

Bikin collaborative whiteboard real-time yang bisa dipake multiple users bareng-bareng, dengan learning outcomes yang jelas di area:

- **CRDT fundamentals** (Yjs awareness + shared types)
- **Real-time networking** (WebSocket lifecycle, reconnection, optimistic updates)
- **Canvas rendering optimization** (dirty rectangles, requestAnimationFrame batching, pointer smoothing)
- **State management** (separation of local vs shared state)
- **Testing pyramid** (unit → integration → e2e)

**Non-goals (v1):**
- Auth/persistence ke DB
- Image upload, text, complex shapes
- Infinite canvas / zoom (>10 shapes cukup)
- Mobile touch optimization
- Production deployment

---

## 2. 🛠️ Tech Stack

| Layer | Tech | Alasan |
|---|---|---|
| **Frontend framework** | React 18 + Vite | Cepat, ekosistem testing gede |
| **Language** | TypeScript (strict) | Type safety buat shared shapes |
| **Canvas** | HTML Canvas 2D (raw) | Full control, no library lock-in |
| **State** | Zustand | Ringan, ga kayak Redux, gampang di-test |
| **CRDT** | Yjs + y-websocket | Battle-tested, awareness built-in |
| **Transport** | WebSocket (via y-websocket) | Default Yjs, persistent |
| **Styling** | Tailwind CSS | Cepet, ga pusing className |
| **Unit test** | Vitest | Vite-native, Jest-compatible API |
| **Component test** | React Testing Library | Standar industri |
| **E2E test** | Playwright | Multi-tab out-of-the-box, perfect buat test collab |
| **Lint/Format** | ESLint + Prettier | Standar |
| **Package mgr** | pnpm | Cepat, hemat disk |

---

## 3. 📁 Project Structure

```
whiteboard/
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Canvas/
│   │   │   │   │   ├── Canvas.tsx
│   │   │   │   │   ├── CanvasRenderer.ts
│   │   │   │   │   ├── pointerTracker.ts
│   │   │   │   │   └── Canvas.test.tsx
│   │   │   │   ├── Toolbar/
│   │   │   │   ├── Cursors/
│   │   │   │   └── UserList/
│   │   │   ├── hooks/
│   │   │   │   ├── useYDoc.ts
│   │   │   │   ├── useAwareness.ts
│   │   │   │   └── useTool.ts
│   │   │   ├── store/
│   │   │   │   └── boardStore.ts
│   │   │   ├── types/
│   │   │   │   └── shapes.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── e2e/
│   │   │   ├── collaboration.spec.ts
│   │   │   └── tools.spec.ts
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── ws/                           # WebSocket server
│       ├── src/
│       │   └── index.ts              # Wraps y-websocket utils
│       └── package.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── shapes.ts             # Shape types & validators
│       │   ├── colors.ts
│       │   └── index.ts
│       └── package.json
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

**Catatan:** Monorepo biar `shared` types bisa dipake frontend & server tanpa duplikasi.

---

## 4. 🔄 Core Flows

### 4.1 User Join Flow

```
[User buka /board/:roomId]
   ↓
[Connect ke ws://localhost:1234/:roomId]
   ↓
[Init Y.Doc + Y.Array<Shape> binding]
   ↓
[Set local awareness: {userId, name, color, cursor: null}]
   ↓
[Subscribe to 'awareness-change' → render remote cursors]
   ↓
[Subscribe to Y.Array observe → re-render canvas]
   ↓
[Ready: user bisa gambar]
```

### 4.2 Draw Flow (Free Hand)

```
[pointerdown] → start new shape, push to local Y.Array
   ↓
[pointermove] (throttled to next animation frame)
   → extend current shape's points[]
   → update Y.Array[index] (in-place)
   ↓
[pointerup]
   → finalize shape
   → exit drawing mode
```

**Optimistic update:** Local Y.Doc update = immediate render (no server roundtrip wait). Yjs handles propagation async.

### 4.3 Draw Flow (Rectangle)

```
[pointerdown] → start shape, points: [start]
   ↓
[pointermove] → update points: [start, current]
   ↓
[pointerup] → finalize
```

### 4.4 Erase Flow

```
[pointerdown] → hit-test against all shapes
   ↓
[pointermove] → hit-test, remove shapes from Y.Array
   ↓
[pointerup] → done
```

### 4.5 Presence Flow (Cursors)

```
[pointermove] (on canvas)
   → update local awareness.cursors = {x, y, tool, color}
   → throttled to 30fps (33ms) to avoid spam
   ↓
[other clients receive awareness change]
   → render remote cursor at position
   → fade out after 3s of no movement
```

### 4.6 Tool Selection

```
[click toolbar]
   → update local store.tool (NOT shared, per-user)
   → update awareness.tool (so others see what tool user pakai)
```

---

## 5. 📐 Data Model

```typescript
// packages/shared/src/shapes.ts

export type ShapeId = string; // ULID
export type Tool = 'pen' | 'rect' | 'eraser' | 'select';

export interface Point {
  x: number;
  y: number;
}

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
  points: Point[]; // [x0,y0,x1,y1,...] for compactness
}

export interface RectShape extends BaseShape {
  type: 'rect';
  color: string;
  width: number;
  start: Point;
  end: Point;
}

export type Shape = PenStroke | RectShape;
```

**Yjs structure:**
```typescript
ydoc.getArray<Shape>('shapes')   // shared shapes
ydoc.getMap('meta')              // room metadata
awareness                        // ephemeral presence (cursors, tool, user)
```

---

## 6. ⚙️ Key Rules & Invariants

### 6.1 Performance Rules
- **Throttle pointermove** to `requestAnimationFrame` (max 60fps)
- **Throttle awareness cursor** to 30fps (33ms) — saves bandwidth
- **Render full canvas each frame** (acceptable for <500 shapes; revisit if perlu)
- **Don't re-render React tree on every shape change** — use refs + manual canvas draw

### 6.2 Concurrency Rules
- **Yjs = source of truth** for shapes. No local mirror.
- **Erase** = `Y.Array.delete(index, 1)`. CRDT handles concurrent erases.
- **Author color = authorId.hash()** (deterministic, stable across reconnects)
- **Awareness state timeout** = 30s (Y.Doc default)

### 6.3 UX Rules
- **No auth**: user name = random adjective+noun (e.g., "BravePanda")
- **No persistence**: refresh = empty room (out of scope v1)
- **Toolbar position**: top-center, fixed
- **Cursor label**: show name + tool emoji below remote cursor
- **Canvas**: white background, 1080p sized (no scroll/zoom v1)

### 6.4 Code Quality Rules
- **Strict TS**: `"strict": true`, no `any` di shared types
- **No magic numbers**: warna, ukuran, throttling di named constants
- **Pure render functions**: `renderShape(ctx, shape)` — no side effects, no React refs inside
- **Hooks di-prefix `use`**: standard
- **Test files co-located**: `Foo.tsx` ↔ `Foo.test.tsx`

---

## 7. 🧪 Testing Strategy (Pyramid)

### 7.1 Unit Tests (Vitest)
**Target coverage: 80%+ untuk pure functions & hooks**

| File | What to test |
|---|---|
| `pointerTracker.test.ts` | Throttling, smoothing, point-to-coord conversion |
| `shapes.test.ts` (shared) | Type guards, validators, hit-test |
| `useTool.test.ts` | Tool state transitions, default values |
| `boardStore.test.ts` | Zustand actions, selectors |
| `colors.test.ts` | Hash function determinism, palette generation |

### 7.2 Integration Tests (Vitest + jsdom)
**Target: critical user paths**

| Scenario | Test |
|---|---|
| Mount Canvas with mock Y.Doc | Verify Y.Array subscribe hook fires on shape add |
| Toolbar interactions | Clicking pen/rect/eraser updates store + awareness |
| User list renders | 2 awareness states → 2 user pills shown |

### 7.3 E2E Tests (Playwright)
**Critical: multi-user collaboration**

| Spec | Scenario |
|---|---|
| `tools.spec.ts` | Single user draws pen, sees stroke. Switches to rect, draws rect, erases it. |
| `collaboration.spec.ts` | **Open 2 browser contexts (alice & bob). Alice draws → bob sees within 500ms. Bob erases alice's shape → both see it gone. Cursor of alice visible on bob's screen and vice versa.** |
| `reconnect.spec.ts` | Disconnect alice's WS mid-draw, reconnect, verify Y.Doc state synced correctly |
| `performance.spec.ts` | Draw 100 shapes, measure frame time stays <16ms |

### 7.4 Manual QA Checklist
- [ ] 2 browsers see each other's cursors in <100ms
- [ ] Erasing someone else's shape works
- [ ] Reconnect preserves existing shapes
- [ ] No console errors / warnings
- [ ] Works in latest Chrome + Firefox

---

## 8. 🚪 Quality Gates

Code **TIDAK BOLEH merge ke main** kalau ada yang berikut gagal:

| Gate | Tool | Threshold |
|---|---|---|
| **TypeScript** | `tsc --noEmit` | 0 errors |
| **ESLint** | `eslint .` | 0 errors, 0 warnings |
| **Unit tests** | `vitest run` | All pass, coverage ≥80% untuk `src/` |
| **Build** | `vite build` | Success, bundle <300KB gzipped |
| **E2E tests** | `playwright test` | All pass |
| **Manual smoke** | - | Local test: 2 browser tabs, draw + erase works |

**Pre-commit hook** (Husky + lint-staged): format + lint + type-check pada staged files.

**CI (later, optional v2):** GitHub Actions running all of the above on PR.

---

## 9. ✅ Definition of Done

Project dianggap **DONE** kalau SEMUA ini terpenuhi:

### Functional
- [ ] User bisa join room via URL parameter
- [ ] Minimal 2 user (2 browser) bisa gambar bareng real-time
- [ ] Tools work: **pen, rectangle, eraser, color picker** (4 minimum)
- [ ] Cursors user lain terlihat dengan label nama
- [ ] User list di sidebar menampilkan semua connected user
- [ ] Disconnect → reconnect, semua shapes masih ada

### Non-Functional
- [ ] Latency draw-to-see: <500ms p95 (di localhost)
- [ ] 60fps maintained saat user lain gambar (no jank di idle screen)
- [ ] Works di Chrome & Firefox latest
- [ ] Zero console errors saat normal usage

### Code & Process
- [ ] **TypeScript strict**, 0 errors
- [ ] **ESLint clean**, 0 warnings
- [ ] **Unit test coverage ≥80%** untuk `src/` (excluding types)
- [ ] **All Playwright E2E tests pass**
- [ ] **README** lengkap: setup, run, test, architecture overview
- [ ] **No TODO/FIXME** left in code
- [ ] **Git history clean** (commits scoped, conventional commits)

### Deployment-Ready (bonus, kalau sempet)
- [ ] Dockerfile untuk ws server
- [ ] Vercel/Netlify config untuk web
- [ ] Demo URL live

---

## 10. 📅 Suggested Weekend Schedule

| Time | Saturday | Sunday |
|---|---|---|
| **Morning (4h)** | Setup monorepo, install deps, basic Vite+React+TS hello world | Implement eraser + color picker + hit-test |
| **Midday (2h)** | Canvas + Yjs init, basic pen tool working solo | Awareness: cursors + user list + tool indicator |
| **Afternoon (2h)** | Add rectangle tool, Y.Array binding | Polish: tailwind styling, toolbar UX, empty states |
| **Evening (2h)** | First e2e test: 2 tabs collaboration | Unit tests, README, demo gif, commit final |

**Total: ~10-12h active coding + testing.**

---

## 11. 🚀 Stretch Goals (kalau masih ada waktu)

Priority order:
1. **Undo/Redo** per-user (`Y.UndoManager` — Yjs has this built-in, ~30 min)
2. **Selection tool** + move shapes
3. **Persistence** ke SQLite (server-side snapshot)
4. **Export as PNG** (`canvas.toBlob`)
5. **Touch support** (pointer events sudah support, tinggal test)

---

## 12. 📚 References

- [Yjs docs](https://docs.yjs.dev/)
- [y-websocket](https://github.com/yjs/y-websocket)
- [Vite + React TS](https://vitejs.dev/guide/)
- [Playwright multi-context](https://playwright.dev/docs/browser-contexts)
- [Canvas perf tips](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

---

*Last updated: Mon 2026-06-15 16:47 UTC*
