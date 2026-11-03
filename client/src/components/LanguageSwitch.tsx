import { useState } from 'react';

import { LAYOUT_TEXT } from '../content/layout';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../i18n/languages';
import { useLanguage } from '../i18n/useLanguage';
import { useText } from '../i18n/useText';

/**
 * "EN | IT": two toggle buttons in the header. Each is named and marked in its own language,
 * so a visitor who cannot read the page still finds theirs. Changing language sweeps a band of
 * marker yellow across the page: the one moment the whole screen changes its words at once.
 */
export function LanguageSwitch() {
  const text = useText(LAYOUT_TEXT);
  const { language, setLanguage } = useLanguage();
  const [sweepCount, setSweepCount] = useState(0);

  function chooseLanguage(code: Language) {
    if (code === language) return;
    setLanguage(code);
    setSweepCount((count) => count + 1);
  }

  return (
    <div role="group" aria-label={text.languageLabel} className="language-switch">
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
      {sweepCount > 0 && <span key={sweepCount} className="language-sweep" aria-hidden="true" />}
    </div>
  );
}
