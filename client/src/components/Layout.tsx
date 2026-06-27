import { NavLink, Outlet } from 'react-router-dom';

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-sm px-2.5 py-1 font-head text-[10px] font-semibold tracking-[0.18em] uppercase transition-colors ${
    isActive
      ? 'bg-signal/10 text-signal'
      : 'text-fg-faint hover:text-fg-muted'
  }`;
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 h-11 border-b border-line bg-ink">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <LensMark />
            <span className="font-head text-[15px] font-extrabold tracking-[0.18em] text-fg uppercase">
              LOG<span className="text-signal">LENS</span>
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Analyze
            </NavLink>
            <NavLink to="/history" className={navClass}>
              History
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Outlet />
      </main>

    </div>
  );
}

function LensMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="14" cy="14" r="7" fill="none" stroke="#c4f135" strokeWidth="2" />
      <line
        x1="19"
        y1="19"
        x2="25.5"
        y2="25.5"
        stroke="#c4f135"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
