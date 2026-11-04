import { useEffect, useState } from 'react';

import { LAYOUT_TEXT } from '../content/layout';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../i18n/languages';
import { useLanguage } from '../i18n/useLanguage';
import { useText } from '../i18n/useText';

/** The curtain is closed fully at this moment; only then the words change, out of sight. */
const CURTAIN_CLOSED_MS = 400;

/**
 * "EN | IT": two toggle buttons in the header. Each is named and marked in its own language.
 * Changing language drops a curtain over the whole page, swaps the words while the page is hidden,
 * then rolls the curtain away. The visitor never sees the words change.
 */
export function LanguageSwitch() {
  const text = useText(LAYOUT_TEXT);
  const { language, setLanguage } = useLanguage();
  const [curtain, setCurtain] = useState<{ id: number; code: Language } | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);

  useEffect(() => {
    if (pendingLanguage === null) return;
    const timer = window.setTimeout(() => setLanguage(pendingLanguage), CURTAIN_CLOSED_MS);
    return () => window.clearTimeout(timer);
  }, [pendingLanguage, setLanguage]);

  function chooseLanguage(code: Language) {
    if (code === language) return;
    setCurtain((previous) => ({ id: (previous?.id ?? 0) + 1, code }));
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
      {curtain && (
        <div
          key={curtain.id}
          className="language-cover"
          aria-hidden="true"
          onAnimationEnd={() => setCurtain(null)}
        >
          <span className="language-cover-code">{LANGUAGE_LABELS[curtain.code].short}</span>
        </div>
      )}
    </div>
  );
}
