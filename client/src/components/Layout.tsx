import { NavLink, Outlet } from 'react-router-dom';

import { LAYOUT_TEXT } from '../content/layout';

function navClass({ isActive }: { isActive: boolean }): string {
  const activeClass = isActive ? 'bg-marker text-ink' : 'text-chalk hover:text-paper';
  return `px-2 py-1 text-xs font-bold tracking-wide uppercase sm:px-2.5 sm:text-sm ${activeClass}`;
}

/** The frame around every page: brand, navigation, then the page itself. */
export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <NavLink
        to="/"
        className="text-xl font-extrabold tracking-tight uppercase sm:text-2xl [font-stretch:125%]"
      >
        {LAYOUT_TEXT.brand}
      </NavLink>
      <nav className="flex items-center gap-2" aria-label={LAYOUT_TEXT.navLabel}>
        <NavLink to="/" end className={navClass}>
          {LAYOUT_TEXT.analyze}
        </NavLink>
        <NavLink to="/history" className={navClass}>
          {LAYOUT_TEXT.history}
        </NavLink>
      </nav>
    </header>
  );
}
