import { useEffect, useId, useState } from 'react';

import { LAYOUT_TEXT } from '../content/layout';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../i18n/languages';
import { useLanguage } from '../i18n/useLanguage';
import { useText } from '../i18n/useText';

/** The ink covers the whole page at this moment; only then the words change, out of sight. */
const INK_COVERS_PAGE_MS = 600;

/** Radius of the ink blob, in CSS pixels at scale 1 (see `.ink-drop` in pages.css). */
const BLOB_RADIUS_PX = 90;

interface InkDrop {
  id: number;
  code: Language;
  /** How much the blob must grow to cover the viewport from its centre. */
  coverScale: number;
}

/** The scale at which the blob covers the farthest corner of the window. */
function coverScale(): number {
  const halfDiagonal = Math.hypot(window.innerWidth, window.innerHeight) / 2;
  return (halfDiagonal * 1.08) / BLOB_RADIUS_PX;
}

/**
 * "EN | IT": two toggle buttons in the header. Each is named and marked in its own language.
 * Changing language drops a drop of ink onto the page. It falls, spreads until it covers the
 * whole screen, the words change under it, then it soaks away into the page.
 */
export function LanguageSwitch() {
  const text = useText(LAYOUT_TEXT);
  const { language, setLanguage } = useLanguage();
  const [drop, setDrop] = useState<InkDrop | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const edgeFilterId = useId();

  useEffect(() => {
    if (pendingLanguage === null) return;
    const timer = window.setTimeout(() => setLanguage(pendingLanguage), INK_COVERS_PAGE_MS);
    return () => window.clearTimeout(timer);
  }, [pendingLanguage, setLanguage]);

  function chooseLanguage(code: Language) {
    if (code === language) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setLanguage(code);
      return;
    }
    setDrop((previous) => ({ id: (previous?.id ?? 0) + 1, code, coverScale: coverScale() }));
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
      {drop && (
        <div
          key={drop.id}
          className="ink-drop"
          aria-hidden="true"
          style={{ '--ink-scale': drop.coverScale } as React.CSSProperties}
          onAnimationEnd={() => setDrop(null)}
        >
          <svg viewBox="0 0 200 200" className="ink-drop-shape" focusable="false">
            <defs>
              <filter id={edgeFilterId} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="34" />
              </filter>
            </defs>
            <circle cx="100" cy="100" r={BLOB_RADIUS_PX} filter={`url(#${edgeFilterId})`} />
          </svg>
          <span className="ink-drop-code">{LANGUAGE_LABELS[drop.code].short}</span>
        </div>
      )}
    </div>
  );
}
