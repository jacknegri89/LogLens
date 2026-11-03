import { NavLink, Outlet } from 'react-router-dom';

import { LAYOUT_TEXT } from '../content/layout';

const NAV_TAB_CLASS = 'nav-tab text-xs font-bold tracking-[0.14em] uppercase sm:text-sm';

/** The frame around every page: the lit desk, brand, navigation, the page, the footer. */
export function Layout() {
  return (
    <div className="desk flex min-h-dvh flex-col">
      <a
        href="#content"
        className="sr-only z-70 bg-marker px-3 py-2 font-bold text-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        {LAYOUT_TEXT.skipToContent}
      </a>
      <SiteHeader />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-6 sm:py-5">
      <NavLink to="/" className="brand flex items-center gap-2.5">
        <BrandMark />
        <span className="flex flex-col">
          <span className="text-lg leading-none font-black tracking-tight uppercase sm:text-2xl [font-stretch:125%]">
            {LAYOUT_TEXT.brand}
          </span>
          <span className="evidence-label mt-1 hidden text-[0.65rem] text-chalk-dim sm:block">
            {LAYOUT_TEXT.brandTagline}
          </span>
        </span>
      </NavLink>
      <nav className="flex shrink-0 items-center sm:gap-2" aria-label={LAYOUT_TEXT.navLabel}>
        <NavLink to="/" end className={NAV_TAB_CLASS}>
          {LAYOUT_TEXT.analyze}
        </NavLink>
        <NavLink to="/history" className={NAV_TAB_CLASS}>
          {LAYOUT_TEXT.history}
        </NavLink>
      </nav>
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
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-dashed border-chalk-dim/40 px-4 py-6 sm:px-6">
      <p className="max-w-3xl font-mono text-sm leading-relaxed text-chalk">
        {LAYOUT_TEXT.footerPrivacy}
      </p>
    </footer>
  );
}
