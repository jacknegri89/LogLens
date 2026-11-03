import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { LanguageContext } from './LanguageContext';
import { detectLanguage, storeLanguage, type Language } from './languages';

/** Holds the page language: it starts from the saved choice or the browser, and is saved on change. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    storeLanguage(language);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <LanguageContext value={value}>{children}</LanguageContext>;
}
