import { NavLink, Outlet } from 'react-router-dom';

function navClass({ isActive }: { isActive: boolean }): string {
  let activeClass = 'text-muted hover:text-ink';
  if (isActive) {
    activeClass = 'text-ink underline decoration-2 underline-offset-8';
  }
  return `text-sm font-medium ${activeClass}`;
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between px-6 py-4">
          <NavLink to="/" className="font-mono text-base font-semibold tracking-tight">
            LogLens
          </NavLink>
          <nav className="flex items-center gap-7" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              Analyze
            </NavLink>
            <NavLink to="/history" className={navClass}>
              History
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
