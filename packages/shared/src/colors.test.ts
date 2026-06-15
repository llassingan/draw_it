import { describe, expect, it } from 'vitest';

import { authorColor, DEFAULT_COLOR, PALETTE } from './colors';

describe('authorColor', () => {
  it('returns a palette color', () => {
    for (const id of ['alice', 'bob', '123', 'user-xyz', 'a']) {
      expect(PALETTE).toContain(authorColor(id));
    }
  });

  it('is deterministic for the same authorId', () => {
    const a = authorColor('alice-42');
    const b = authorColor('alice-42');
    expect(a).toBe(b);
  });

  it('produces different colors for different ids (most of the time)', () => {
    const colors = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      colors.add(authorColor(`user-${i}`));
    }
    expect(colors.size).toBeGreaterThan(PALETTE.length / 2);
  });

  it('handles empty string without throwing', () => {
    expect(() => authorColor('')).not.toThrow();
  });

  it('DEFAULT_COLOR is the first palette entry', () => {
    expect(DEFAULT_COLOR).toBe(PALETTE[0]);
  });
});
