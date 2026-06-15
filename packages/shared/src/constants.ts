import type { Tool } from './shapes';

export const DEFAULT_STROKE_WIDTH = 2;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 24;

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 720;
export const CANVAS_BACKGROUND = '#ffffff';

export const AWARENESS_THROTTLE_MS = 33;
export const POINTERMOVE_BATCH_MS = 0;

export const AWARENESS_TIMEOUT_MS = 30_000;

export const CURSOR_FADE_AFTER_MS = 3_000;

export const CURSOR_DELTA_PX = 2;

export const TOOLS: readonly Tool[] = ['pen', 'rect', 'eraser'] as const;

export const DEFAULT_ROOM_ID = 'default';

export const DEFAULT_WS_PATH = '';

export const NAME_ADJECTIVES = [
  'Brave', 'Swift', 'Calm', 'Eager', 'Mighty', 'Clever', 'Lucky', 'Gentle',
  'Bold', 'Witty', 'Cosmic', 'Mystic', 'Sunny', 'Cosy', 'Frosty', 'Stellar',
] as const;

export const NAME_ANIMALS = [
  'Panda', 'Otter', 'Fox', 'Wolf', 'Hawk', 'Bear', 'Lynx', 'Owl',
  'Falcon', 'Dolphin', 'Tiger', 'Eagle', 'Raven', 'Koala', 'Moose', 'Whale',
] as const;
