import { describe, expect, it } from 'vitest';

import { shortenText } from './eventTimeline';

describe('shortenText', () => {
  it('keeps a text that fits', () => {
    expect(shortenText('short title', 70)).toBe('short title');
  });

  it('cuts at a whole word, never inside one', () => {
    const shortened = shortenText(
      'TypeError: Cannot read properties of undefined (reading rows)',
      40,
    );

    expect(shortened).toBe('TypeError: Cannot read properties of...');
    expect(shortened.length).toBeLessThanOrEqual(40);
  });

  it('cuts a long word without spaces at the limit', () => {
    expect(shortenText('x'.repeat(100), 20)).toBe(`${'x'.repeat(17)}...`);
  });
});
