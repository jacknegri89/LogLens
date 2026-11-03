import { useContext } from 'react';

import { LanguageContext, type LanguageContextValue } from './LanguageContext';

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage needs a LanguageProvider above it.');
  return value;
}
