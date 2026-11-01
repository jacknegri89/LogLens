import { NavLink, Outlet } from 'react-router-dom';

function navClass({ isActive }: { isActive: boolean }): string {
  let activeClass = 'text-fg-faint hover:text-fg';
  if (isActive) {
    activeClass = 'bg-white/8 text-fg';
  }
  return `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeClass}`;
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <NavLink to="/" className="flex items-center gap-3">
          <LensMark />
          <span className="font-display text-lg font-medium tracking-tight text-fg">LogLens</span>
        </NavLink>
        <nav className="flex items-center gap-1" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Analyze
          </NavLink>
          <NavLink to="/history" className={navClass}>
            History
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20">
        <Outlet />
      </main>
    </div>
  );
}

/** A lens with a beam of light passing through it. */
function LensMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lens-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f6bff" />
          <stop offset="0.5" stopColor="#4fd6ff" />
          <stop offset="1" stopColor="#ff4f8b" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="10" fill="none" stroke="#f1f3ff" strokeWidth="1.6" />
      <path d="M2 16h9" stroke="#f1f3ff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path d="M16 11.5l7 4.5-7 4.5z" fill="url(#lens-beam)" />
    </svg>
  );
}
