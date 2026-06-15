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

function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

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

export const DEFAULT_COLOR: PaletteColor = PALETTE[0];
