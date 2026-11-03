import { describe, expect, it } from 'vitest';

import { formatDate } from './format';

// Mid-month and at noon UTC, so no time zone moves it to another month.
const JUNE = '2026-06-15T12:00:00Z';

describe('formatDate', () => {
  it('writes the month in English for the English page', () => {
    expect(formatDate(JUNE, 'en')).toContain('Jun');
  });

  it('writes the month in Italian for the Italian page', () => {
    expect(formatDate(JUNE, 'it')).toContain('giu');
  });

  it('gives a different text in each language', () => {
    expect(formatDate(JUNE, 'en')).not.toBe(formatDate(JUNE, 'it'));
  });
});
