import type { Language } from './languages';
import { useLanguage } from './useLanguage';

/** The table of the page language. Call it in a component or hook; the page re-renders on change. */
export function useText<T>(texts: Record<Language, T>): T {
  return texts[useLanguage().language];
}
