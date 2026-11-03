/** The languages the reports can be written in. */
export type Language = 'en' | 'it';

/** The language used when the client sends no language, or one the server does not know. */
export const DEFAULT_LANGUAGE = 'en' satisfies Language;

/** A language that has a text table next to the English one (every language but the default). */
export type TranslatedLanguage = Exclude<Language, typeof DEFAULT_LANGUAGE>;

const LANGUAGE_PREFIX = /^([a-z]{2})(?:[-_]|$)/;
const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'it'];

/**
 * Reads the value of the `X-Language` header. "it" and "it-IT" mean Italian, in any case;
 * a missing or unknown value gives the default language, so a bad header never fails a request.
 */
export function parseLanguage(header: string | undefined): Language {
  const code = LANGUAGE_PREFIX.exec((header ?? '').trim().toLowerCase())?.[1];
  return SUPPORTED_LANGUAGES.find((language) => language === code) ?? DEFAULT_LANGUAGE;
}
