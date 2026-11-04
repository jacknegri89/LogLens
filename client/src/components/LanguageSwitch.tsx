import { useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import { LAYOUT_TEXT } from '../content/layout';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../i18n/languages';
import { useLanguage } from '../i18n/useLanguage';
import { useText } from '../i18n/useText';

/** The whole drop lasts this long: it falls, blooms over the page, then soaks back into the switch. */
const DROP_DURATION_MS = 1300;
/** The ink covers the whole page at about this moment; only then the words change, out of sight. */
const INK_COVERS_PAGE_MS = 700;
/** Radius of the blob in CSS pixels at scale 1 (see `.ink-drop` in pages.css). */
const BLOB_RADIUS_PX = 90;
/** Splatter droplets thrown out when the drop lands: where each one ends, relative to the impact. */
const SPLATTERS: { x: number; y: number; size: number }[] = [
  { x: -120, y: -40, size: 14 },
  { x: 110, y: -70, size: 9 },
  { x: -70, y: 90, size: 11 },
  { x: 140, y: 40, size: 16 },
  { x: 40, y: 130, size: 7 },
  { x: -150, y: 20, size: 8 },
];

interface InkDrop {
  id: number;
  code: Language;
  /** Where the drop falls from: the centre of the button that was pressed. */
  originX: number;
  originY: number;
  /** How much the blob must grow to cover the whole window from its origin. */
  coverScale: number;
}

/** The scale at which the blob covers the farthest corner of the window from the origin. */
function coverScaleFrom(originX: number, originY: number): number {
  const farthestX = Math.max(originX, window.innerWidth - originX);
  const farthestY = Math.max(originY, window.innerHeight - originY);
  return (Math.hypot(farthestX, farthestY) * 1.08) / BLOB_RADIUS_PX;
}

function dropFrom(event: MouseEvent<HTMLButtonElement>, code: Language, id: number): InkDrop {
  const box = event.currentTarget.getBoundingClientRect();
  const originX = box.left + box.width / 2;
  const originY = box.top + box.height / 2;
  return { id, code, originX, originY, coverScale: coverScaleFrom(originX, originY) };
}

/**
 * "EN | IT": two toggle buttons in the header. Each is named and marked in its own language.
 * Changing language drops ink from the pressed button. It falls, lands with a splash, blooms over
 * the whole page, the words change under it, and then it is soaked back into the switch.
 */
export function LanguageSwitch() {
  const text = useText(LAYOUT_TEXT);
  const { language, setLanguage } = useLanguage();
  const [drop, setDrop] = useState<InkDrop | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const edgeFilterId = useId();
  // Every press gets a new key, so a second press starts a fresh animation.
  const dropCount = useRef(0);

  useEffect(() => {
    if (pendingLanguage === null) return;
    const timer = window.setTimeout(() => setLanguage(pendingLanguage), INK_COVERS_PAGE_MS);
    return () => window.clearTimeout(timer);
  }, [pendingLanguage, setLanguage]);

  function chooseLanguage(event: MouseEvent<HTMLButtonElement>, code: Language) {
    if (code === language) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setLanguage(code);
      return;
    }
    // Read the button's position now: React clears event.currentTarget after the handler returns.
    dropCount.current += 1;
    setDrop(dropFrom(event, code, dropCount.current));
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
          onClick={(event) => chooseLanguage(event, code)}
          className="language-option"
        >
          {LANGUAGE_LABELS[code].short}
        </button>
      ))}
      {drop && (
        <div
          key={drop.id}
          className="ink-drop-layer"
          aria-hidden="true"
          style={
            {
              '--origin-x': `${drop.originX}px`,
              '--origin-y': `${drop.originY}px`,
              '--ink-scale': drop.coverScale,
              '--drop-duration': `${DROP_DURATION_MS}ms`,
            } as CSSProperties
          }
          onAnimationEnd={() => setDrop(null)}
        >
          <div className="ink-drop">
            <svg viewBox="0 0 200 200" className="ink-drop-shape" focusable="false">
              <defs>
                <filter id={edgeFilterId} x="-30%" y="-30%" width="160%" height="160%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7">
                    <animate
                      attributeName="baseFrequency"
                      values="0.035;0.06;0.04;0.035"
                      dur="1.3s"
                      repeatCount="1"
                    />
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" scale="34" />
                </filter>
              </defs>
              <circle
                cx="100"
                cy="100"
                r={BLOB_RADIUS_PX}
                filter={`url(#${edgeFilterId})`}
                className="ink-drop-body"
              />
            </svg>
          </div>
          {SPLATTERS.map((splatter, index) => (
            <span
              key={index}
              className="ink-splatter"
              style={
                {
                  '--splat-x': `${splatter.x}px`,
                  '--splat-y': `${splatter.y}px`,
                  '--splat-size': `${splatter.size}px`,
                } as CSSProperties
              }
            />
          ))}
          <span className="ink-drop-code">{LANGUAGE_LABELS[drop.code].short}</span>
        </div>
      )}
    </div>
  );
}
