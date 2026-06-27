import { NavLink, Outlet } from 'react-router-dom';

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-lg px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-all ${
    isActive
      ? 'bg-signal/10 text-signal'
      : 'text-fg-muted hover:text-fg hover:bg-surface/60'
  }`;
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-ink/85 backdrop-blur-md">
        {/* Signal accent line at the very top of the viewport */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal/50 to-transparent" />
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <NavLink to="/" className="flex items-center gap-2.5">
            <LensMark />
            <span className="font-mono text-sm font-semibold tracking-[0.2em] text-fg uppercase">
              Log<span className="text-signal">Lens</span>
            </span>
          </NavLink>
          <nav className="flex items-center gap-1.5">
            <NavLink to="/" end className={navClass}>
              Analyze
            </NavLink>
            <NavLink to="/history" className={navClass}>
              History
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-10">
        <div className="border-t border-line/40 pt-8 text-center font-mono text-xs text-fg-faint">
          LogLens — AI log analysis
        </div>
      </footer>
    </div>
  );
}

function LensMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="14" cy="14" r="7" fill="none" stroke="#c4f135" strokeWidth="2.5" />
      <line
        x1="19"
        y1="19"
        x2="25.5"
        y2="25.5"
        stroke="#c4f135"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
