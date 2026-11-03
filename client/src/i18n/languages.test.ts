import { describe, expect, it } from 'vitest';

import { isLanguage, languageFromBrowser } from './languages';

describe('languageFromBrowser', () => {
  it('picks the first browser language the site has', () => {
    expect(languageFromBrowser(['fr-FR', 'it-IT', 'en-US'])).toBe('it');
  });

  it('ignores the region and the letter case', () => {
    expect(languageFromBrowser(['IT-ch'])).toBe('it');
  });

  it('falls back to English when the site has none of them', () => {
    expect(languageFromBrowser(['de-DE', 'ja'])).toBe('en');
    expect(languageFromBrowser([])).toBe('en');
  });
});

describe('isLanguage', () => {
  it('accepts the supported codes only', () => {
    expect(isLanguage('it')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});
