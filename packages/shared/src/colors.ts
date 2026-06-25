/**
 * Deterministic author color system.
 *
 * Each author is assigned a color from `PALETTE` via `authorColor(authorId)`.
 * The mapping is **stable across sessions** — the same `authorId` always
 * produces the same color — because it uses the djb2 hash function modulo the
 * palette length. This avoids re-assigning colors on reconnect and keeps the
 * user's own strokes visually consistent.
 *
 * The palette has **8 distinct colors**, sufficient for ~8 simultaneous users
 * before collisions become likely.
 */

/** Eight visually distinct colors assigned to authors deterministically. */
export const PALETTE = [
  '#1e1e1e',
  '#e03131',
  '#2f9e44',
  '#1971c2',
  '#f08c00',
  '#9c36b5',
  '#0c8599',
  '#c2255c',
] as const;

export type PaletteColor = (typeof PALETTE)[number];

/**
 * djb2 string hash — chosen for speed and stability.
 *
 * Unlike cryptographic hashes, djb2 is:
 *   - **Fast** — a few integer ops per character, no heap allocations.
 *   - **Stable** — produces the same output across runtimes (Node, browser)
 *     and process restarts, which is essential for deterministic color assignment.
 *   - **Uniform enough** — distributes author IDs evenly across the palette.
 *
 * The `| 0` clamps to 32-bit signed int; `>>> 0` converts to unsigned before
 * the modulo in `authorColor`.
 */
function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Maps an author ID to a stable palette color via `djb2(authorId) % palette.length`.
 * The same `authorId` always returns the same color, even across page reloads
 * and reconnects.
 */
export function authorColor(authorId: string): PaletteColor {
  const index = djb2(authorId) % PALETTE.length;
  const color = PALETTE[index];
  if (color === undefined) {
    const fallback = PALETTE[0];
    if (fallback === undefined) {
      throw new Error('PALETTE is empty');
    }
    return fallback;
  }
  return color;
}

/** Default stroke color used when no author color can be resolved. */
export const DEFAULT_COLOR: PaletteColor = PALETTE[0];
