import { NavLink, Outlet } from 'react-router-dom';

function navClass({ isActive }: { isActive: boolean }): string {
  let activeClass = 'text-chalk hover:text-paper';
  if (isActive) {
    activeClass = 'bg-marker text-ink';
  }
  return `px-2 py-1 text-xs font-bold tracking-wide uppercase sm:px-2.5 sm:text-sm ${activeClass}`;
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <NavLink
          to="/"
          className="text-xl font-extrabold tracking-tight uppercase sm:text-2xl [font-stretch:125%]"
        >
          LogLens
        </NavLink>
        <nav className="flex items-center gap-2" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Analyze
          </NavLink>
          <NavLink to="/history" className={navClass}>
            History
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
