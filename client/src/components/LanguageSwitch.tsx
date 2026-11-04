import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { LAYOUT_TEXT } from '../content/layout';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../i18n/languages';
import { useLanguage } from '../i18n/useLanguage';
import { useText } from '../i18n/useText';

/** The sheet drops, is pinned in place, and lifts away. */
const SHEET_DURATION_MS = 1150;
/** The sheet covers the whole page at about this moment; only then the words change, out of sight. */
const SHEET_COVERS_PAGE_MS = 470;

interface CaseSheet {
  id: number;
  code: Language;
}

/**
 * "EN | IT": two toggle buttons in the header. Each is named and marked in its own language.
 * Changing language drops a sheet of the case file over the page, pinned with tape. While it
 * covers everything the words change, then the sheet is lifted away and the new page is there.
 */
export function LanguageSwitch() {
  const text = useText(LAYOUT_TEXT);
  const { language, setLanguage } = useLanguage();
  const [sheet, setSheet] = useState<CaseSheet | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  // Every press gets a new key, so a second press starts a fresh animation.
  const sheetCount = useRef(0);

  useEffect(() => {
    if (pendingLanguage === null) return;
    const timer = window.setTimeout(() => setLanguage(pendingLanguage), SHEET_COVERS_PAGE_MS);
    return () => window.clearTimeout(timer);
  }, [pendingLanguage, setLanguage]);

  function chooseLanguage(code: Language) {
    if (code === language) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setLanguage(code);
      return;
    }
    sheetCount.current += 1;
    setSheet({ id: sheetCount.current, code });
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
      {sheet &&
        createPortal(
          <div
            key={sheet.id}
            className="case-sheet-layer"
            aria-hidden="true"
            style={{ '--sheet-duration': `${SHEET_DURATION_MS}ms` } as CSSProperties}
            onAnimationEnd={() => setSheet(null)}
          >
            <div className="case-sheet">
              <span className="case-sheet-tape" />
              <span className="case-sheet-head">
                CASE FILE · {LANGUAGE_LABELS[sheet.code].name}
              </span>
              <span className="case-sheet-code">{LANGUAGE_LABELS[sheet.code].short}</span>
              <span className="case-sheet-foot">No. {String(sheet.id).padStart(3, '0')}</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
