import { describe, expect, it } from 'vitest';

import { DEFAULT_LANGUAGE, parseLanguage } from './language';

describe('parseLanguage', () => {
  it.each(['it', 'IT', 'it-IT', 'it_IT', ' it ', 'It-it'])('reads %j as Italian', (header) => {
    expect(parseLanguage(header)).toBe('it');
  });

  it.each(['en', 'EN', 'en-US', 'en-GB'])('reads %j as English', (header) => {
    expect(parseLanguage(header)).toBe('en');
  });

  it.each([undefined, '', '   ', 'fr', 'de-DE', 'italian', 'iti', 'it;q=0.8x', '*', 'xx'])(
    'falls back to English for %j',
    (header) => {
      expect(parseLanguage(header)).toBe(DEFAULT_LANGUAGE);
      expect(DEFAULT_LANGUAGE).toBe('en');
    },
  );
});
