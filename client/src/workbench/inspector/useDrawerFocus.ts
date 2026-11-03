import { useEffect, type RefObject } from 'react';

/**
 * Moves focus into the drawer when it opens and hands it back to the opener when it closes.
 * When another line replaces the content and the focused element disappears with it, focus
 * comes back to the drawer so the keyboard keeps working.
 */
export function useDrawerFocus(drawerRef: RefObject<HTMLElement | null>, lineIndex: number): void {
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawerRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [drawerRef]);

  useEffect(() => {
    if (document.activeElement === document.body) drawerRef.current?.focus({ preventScroll: true });
  }, [drawerRef, lineIndex]);
}
