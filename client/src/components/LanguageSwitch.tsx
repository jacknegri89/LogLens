import { useEffect, useState } from 'react';

import { LAYOUT_TEXT } from '../content/layout';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../i18n/languages';
import { useLanguage } from '../i18n/useLanguage';
import { useText } from '../i18n/useText';

/** The stamp lands on the page at this moment; the words change under it, as the stamp hits. */
const IMPACT_DELAY_MS = 260;

/**
 * "EN | IT": two toggle buttons in the header. Each is named and marked in its own language.
 * Changing language stamps the new code onto the page, and the words change when it lands.
 */
export function LanguageSwitch() {
  const text = useText(LAYOUT_TEXT);
  const { language, setLanguage } = useLanguage();
  const [stamp, setStamp] = useState<{ id: number; code: Language } | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);

  useEffect(() => {
    if (pendingLanguage === null) return;
    const timer = window.setTimeout(() => setLanguage(pendingLanguage), IMPACT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pendingLanguage, setLanguage]);

  function chooseLanguage(code: Language) {
    if (code === language) return;
    setStamp((previous) => ({ id: (previous?.id ?? 0) + 1, code }));
    setPendingLanguage(code);
  }

  return (
    <div
      role="group"
      aria-label={text.languageLabel}
      className="language-switch"
      data-language={language}
    >
      <span className="language-pill" aria-hidden="true" />
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={LANGUAGE_LABELS[code].name}
          aria-pressed={language === code}
          onClick={() => chooseLanguage(code)}
          className="language-option"
        >
          {LANGUAGE_LABELS[code].short}
        </button>
      ))}
      {stamp && (
        <span key={stamp.id} className="language-stamp" aria-hidden="true">
          {LANGUAGE_LABELS[stamp.code].short}
        </span>
      )}
    </div>
  );
}
