/**
 * Application-wide constants for the collaborative whiteboard.
 *
 * Covers everything from canvas dimensions and stroke limits to zoom ranges,
 * real-time awareness throttling, and the random-name adjective/animal lists.
 */

import type { Tool } from './shapes';

// ---- Stroke defaults ----

export const DEFAULT_STROKE_WIDTH = 2;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 24;

// ---- Canvas defaults ----

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 720;
export const CANVAS_BACKGROUND = '#ffffff';

// ---- Awareness / throttling ----

/** Minimum interval (ms) between awareness (cursor position) broadcasts. */
export const AWARENESS_THROTTLE_MS = 33;

/**
 * Batching window for pointermove events. When set to 0, updates are
 * dispatched immediately (no batching) — the throttle is handled by
 * `requestAnimationFrame` at the consumer level instead.
 */
export const POINTERMOVE_BATCH_MS = 0;

/** Time (ms) after which a peer's awareness state is considered stale. */
export const AWARENESS_TIMEOUT_MS = 30_000;

/** Time (ms) before a remote cursor starts fading out after the peer stops moving. */
export const CURSOR_FADE_AFTER_MS = 3_000;

/**
 * Minimum pixel distance a cursor must move before a new awareness update
 * is sent. Prevents flooding the network with sub-pixel noise.
 */
export const CURSOR_DELTA_PX = 2;

/** List of drawing tools (excluding `select`, which is a UI-only concept). */
export const TOOLS: readonly Tool[] = ['pen', 'rect', 'triangle', 'circle', 'eraser', 'pan'] as const;

// ---- Zoom limits ----

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 5;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1;

// ---- Grid ----

export const GRID_SPACING_PX = 24;

// ---- Room / connection defaults ----

export const DEFAULT_ROOM_ID = 'default';

export const DEFAULT_WS_PATH = '';

// ---- Random name generation (adjective + animal) ----

export const NAME_ADJECTIVES = [
  'Brave', 'Swift', 'Calm', 'Eager', 'Mighty', 'Clever', 'Lucky', 'Gentle',
  'Bold', 'Witty', 'Cosmic', 'Mystic', 'Sunny', 'Cosy', 'Frosty', 'Stellar',
] as const;

export const NAME_ANIMALS = [
  'Panda', 'Otter', 'Fox', 'Wolf', 'Hawk', 'Bear', 'Lynx', 'Owl',
  'Falcon', 'Dolphin', 'Tiger', 'Eagle', 'Raven', 'Koala', 'Moose', 'Whale',
] as const;
