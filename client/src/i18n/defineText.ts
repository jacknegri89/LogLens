import type { Language } from './languages';

/**
 * A text table in every language. The type makes each language have the same keys, so a
 * missing translation is a compile error and not a blank on the page.
 */
export function defineText<T>(texts: Record<Language, T>): Record<Language, T> {
  return texts;
}

/** The shape of one language of a table, for code that receives the table already chosen. */
export type TextOf<Table> = Table extends Record<Language, infer Text> ? Text : never;
