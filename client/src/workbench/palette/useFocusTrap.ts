import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Where Tab should go instead, or null when the browser's own move stays inside the container. */
function wrapTarget(container: HTMLElement, backwards: boolean): HTMLElement | null {
  const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0] ?? container;
  const last = focusable[focusable.length - 1] ?? container;
  const active = document.activeElement;
  if (backwards) {
    if (active === first || !container.contains(active)) {
      return last;
    }
    return null;
  }
  if (active === last || !container.contains(active)) {
    return first;
  }
  return null;
}

/** Keeps Tab inside the container while it is mounted and gives focus back to where it came from. */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;
    const opener = document.activeElement;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !container) {
        return;
      }
      const target = wrapTarget(container, event.shiftKey);
      if (!target) {
        return;
      }
      event.preventDefault();
      target.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  }, [containerRef]);
}
