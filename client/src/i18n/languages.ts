export const LANGUAGES = ['en', 'it'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Each language is named in itself, so a visitor can find theirs whatever the page language. */
export const LANGUAGE_LABELS: Record<Language, { short: string; name: string }> = {
  en: { short: 'EN', name: 'English' },
  it: { short: 'IT', name: 'Italiano' },
};

const STORAGE_KEY = 'loglens-language';
const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** The language the visitor chose before, or null when none is saved or storage is blocked. */
export function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage can be blocked; the choice then lasts until the page closes.
  }
}

/** The browser's first language when the site has it, otherwise English. */
export function languageFromBrowser(browserLanguages: readonly string[]): Language {
  const match = browserLanguages
    .map((tag) => tag.toLowerCase().split('-')[0])
    .find((code) => isLanguage(code));
  if (isLanguage(match)) {
    return match;
  }
  return DEFAULT_LANGUAGE;
}

/** The saved choice first, then the browser language. */
export function detectLanguage(): Language {
  return readStoredLanguage() ?? languageFromBrowser(navigator.languages ?? [navigator.language]);
}
