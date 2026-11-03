import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';

import '../../styles/workbench-palette.css';
import { applyStoredTheme } from './contrastTheme';

// The window loads only when it is first opened, so the shortcut costs almost nothing on every page.
const PaletteDialog = lazy(() =>
  import('./PaletteDialog').then((module) => ({ default: module.PaletteDialog })),
);

function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
}

/** Opens the command palette with Ctrl K or Cmd K from any page, and applies the saved theme. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  useLayoutEffect(applyStoredTheme, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      setOpen((current) => !current);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <PaletteDialog onClose={() => setOpen(false)} />
    </Suspense>
  );
}
