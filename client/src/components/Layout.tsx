import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { LAYOUT_TEXT } from '../content/layout';
import { PRIVACY_TEXT } from '../content/privacy';
import { useHeaderVisibility } from '../hooks/useHeaderVisibility';
import { usePageMeta } from '../hooks/usePageMeta';
import { useText } from '../i18n/useText';
import { CommandPalette } from '../workbench/palette/CommandPalette';
import { LanguageSwitch } from './LanguageSwitch';

const NAV_TAB_CLASS =
  'nav-tab px-2 text-[11px] font-bold tracking-[0.06em] uppercase sm:px-[0.7rem] sm:text-sm sm:tracking-[0.14em]';

/** The frame around every page: the lit desk, brand, navigation, the page, the footer. */
export function Layout() {
  const text = useText(LAYOUT_TEXT);
  const location = useLocation();
  usePageMeta();
  return (
    <div className="desk flex min-h-dvh flex-col">
      <a
        href="#content"
        className="sr-only z-70 bg-marker px-3 py-2 font-bold text-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        {text.skipToContent}
      </a>
      <SiteHeader />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">
        {/* Keyed by the route, so every change of section plays the entrance again. */}
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
      <CommandPalette />
    </div>
  );
}

function SiteHeader() {
  const text = useText(LAYOUT_TEXT);
  const isHeaderVisible = useHeaderVisibility();
  let hiddenClass = '';
  if (!isHeaderVisible) {
    hiddenClass = '-translate-y-full';
  }
  // Solid background, so the page scrolling under it does not show through the letters.
  // A hidden header is also made inert, so keyboard focus cannot land on links that are off screen.
  return (
    <header
      inert={!isHeaderVisible}
      className={`sticky top-0 z-20 w-full bg-felt transition-transform duration-300 motion-reduce:transition-none ${hiddenClass}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-3 px-4 py-4 sm:px-6 sm:py-5">
        <NavLink to="/" className="brand flex items-center gap-2.5">
          <BrandMark />
          <span className="flex flex-col">
            <span className="brand-word text-lg leading-none font-black tracking-tight uppercase sm:text-2xl [font-stretch:125%]">
              {text.brand}
            </span>
          </span>
        </NavLink>
        {/* On desktop the switch goes after the menu, at the far right; on phones it stays beside the brand. */}
        <div className="sm:order-last">
          <LanguageSwitch />
        </div>
        {/* On phones the tabs drop to their own full-width row; on desktop they sit beside the switch. */}
        <nav
          className="order-last flex w-full items-center justify-between sm:order-none sm:mr-2 sm:ml-auto sm:w-auto sm:justify-start sm:gap-2"
          aria-label={text.navLabel}
        >
          <NavLink to="/" end className={NAV_TAB_CLASS}>
            {text.analyze}
          </NavLink>
          <NavLink to="/workbench" className={NAV_TAB_CLASS}>
            {text.workbench}
          </NavLink>
          <NavLink to="/history" className={NAV_TAB_CLASS}>
            {text.history}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

/** A small magnifying glass beside the name; it tilts when the brand is pointed at. */
function BrandMark() {
  return (
    <svg className="brand-mark size-7 shrink-0 sm:size-8" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="13" cy="13" r="9" fill="var(--color-marker)" fillOpacity="0.18" />
      <circle cx="13" cy="13" r="9" fill="none" stroke="var(--color-paper)" strokeWidth="3" />
      <path d="M8.5 13h9" stroke="var(--color-marker)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 20l8 8" stroke="var(--color-paper)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function SiteFooter() {
  const text = useText(LAYOUT_TEXT);
  const privacyText = useText(PRIVACY_TEXT);
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-dashed border-chalk-dim/40 px-4 py-6 sm:px-6">
      <p className="max-w-3xl font-mono text-sm leading-relaxed text-chalk">{text.footerPrivacy}</p>
      <NavLink to="/privacy" className="footer-link mt-3 inline-block">
        {privacyText.footerLink}
      </NavLink>
    </footer>
  );
}
