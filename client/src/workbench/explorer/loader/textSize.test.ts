import { describe, expect, it } from 'vitest';

import { utf8ByteLength } from './textSize';

describe('utf8ByteLength', () => {
  it('matches the real UTF-8 encoding for every kind of character', () => {
    for (const text of ['', 'ERROR 500', 'città è già', '→ ✓', 'log 🔥 done']) {
      expect(utf8ByteLength(text)).toBe(new TextEncoder().encode(text).length);
    }
  });

  it('counts a lone surrogate as the replacement character', () => {
    expect(utf8ByteLength('\ud83d')).toBe(3);
  });
});
